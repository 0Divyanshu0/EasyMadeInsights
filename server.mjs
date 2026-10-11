import path from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";
import fs from "node:fs/promises";
import { spawn } from "node:child_process";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import multer from "multer";
import OpenAI from "openai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, ".env");

dotenv.config({ path: envPath });

const app = express();
const port = process.env.PORT || 8787;
const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const upload = multer({
  dest: path.join(os.tmpdir(), "easymadeinsights_uploads"),
  limits: { fileSize: 50 * 1024 * 1024 },
});

function runProcess(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: __dirname,
      windowsHide: true,
      stdio: ["ignore", "ignore", "pipe"],
    });
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("Document conversion timed out. Try a smaller file."));
    }, 90000);

    let stderr = "";

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(stderr || `Process exited with code ${code}`));
      }
    });
  });
}

async function runPythonConverter(mode, inputPath, outputPath, options = []) {
  const scriptPath = path.join(__dirname, "python", "convert_tool.py");
  const configuredPython = process.env.PYTHON_BIN;
  const localPython = path.join(__dirname, ".venv", process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
  const argumentsList = [scriptPath, mode, inputPath, outputPath, ...options];
  const pythonCommands = [
    ...(configuredPython ? [[configuredPython, argumentsList]] : []),
    [localPython, argumentsList],
    ["python", argumentsList],
    ["python3", argumentsList],
    ["py", argumentsList],
  ];

  let lastError;

  for (const [command, args] of pythonCommands) {
    try {
      console.log(`🐍 Trying Python runtime: ${command}`);
      await runProcess(command, args);
      console.log(`✅ Python runtime succeeded: ${command}`);
      return;
    } catch (error) {
      const text = String(error?.message || "");
      lastError = error;
      console.warn(`⚠️ Python runtime failed (${command}): ${text.split("\n")[0]}`);

      const commandMissing =
        text.includes("not recognized") ||
        text.includes("ENOENT") ||
        text.includes("No Installed Pythons Found") ||
        text.includes("can't open file") ||
        text.includes("No module named");

      // If command/runtime missing, try next candidate.
      if (commandMissing) {
        continue;
      }

      // If runtime exists but conversion failed (e.g. missing module), stop and return that real error.
      throw error;
    }
  }

  const text = String(lastError?.message || "");
  if (text.includes("No Installed Pythons Found")) {
    throw new Error(
      "Python runtime not found. Install Python 3 or use LibreOffice fallback."
    );
  }

  throw lastError || new Error("Python conversion failed.");
}

async function runSofficeConverter(inputPath, outputPath, format) {
  const outDir = path.dirname(outputPath);
  const args = [
    "--headless",
    "--convert-to",
    format,
    "--outdir",
    outDir,
    inputPath,
  ];

  await runProcess("soffice", args);

  const generatedPath = path.join(
    outDir,
    `${path.parse(inputPath).name}.${format}`
  );

  const sourcePath = generatedPath;
  try {
    await fs.access(sourcePath);
  } catch {
    throw new Error(`LibreOffice did not produce ${format.toUpperCase()} output.`);
  }

  if (sourcePath !== outputPath) {
    await fs.rename(sourcePath, outputPath);
  }
}

async function safeUnlink(filePath) {
  if (!filePath) return;
  try {
    await fs.unlink(filePath);
  } catch {
    // ignore cleanup errors
  }
}

async function ensureInputWithExtension(tempPath, originalName) {
  const ext = path.extname(originalName || "") || "";
  if (!ext) {
    return tempPath;
  }

  const withExtPath = `${tempPath}${ext.toLowerCase()}`;
  await fs.rename(tempPath, withExtPath);
  return withExtPath;
}

function extractJsonObject(content) {
  if (!content) {
    return "";
  }

  const trimmed = content.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);

  if (fencedMatch) {
    return fencedMatch[1].trim();
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
}

app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    aiConfigured: Boolean(process.env.OPENAI_API_KEY),
    model,
  });
});

app.post("/api/convert/pdf-to-word", upload.single("file"), async (req, res) => {
  const uploadedPath = req.file?.path;
  let inputPath = uploadedPath;

  try {
    if (!req.file) {
      console.log("❌ PDF-to-Word: No file provided");
      return res.status(400).json({ error: "A PDF file is required." });
    }

    const originalName = req.file.originalname || "converted.pdf";
    console.log(`📄 PDF-to-Word: Processing ${originalName}`);
    
    if (!originalName.toLowerCase().endsWith(".pdf")) {
      await safeUnlink(uploadedPath);
      console.log(`❌ PDF-to-Word: Invalid file type: ${originalName}`);
      return res.status(400).json({ error: "Only PDF files are supported." });
    }

    inputPath = await ensureInputWithExtension(uploadedPath, originalName);
    console.log(`🔧 PDF-to-Word: File path with extension: ${inputPath}`);

    const outputPath = `${inputPath}.docx`;
    const outputName = `${path.parse(originalName).name}.docx`;

    console.log(`⚙️  PDF-to-Word: Starting conversion...`);
    const ocrMode = req.body?.ocrMode ?? "auto";
    if (!["auto", "force"].includes(ocrMode)) {
      await safeUnlink(inputPath);
      return res.status(400).json({ error: "Text recovery mode must be auto or force." });
    }
    // Do not fall back to an image-only office export after editable extraction fails.
    await runPythonConverter("pdf-to-word", inputPath, outputPath, [ocrMode]);

    const buffer = await fs.readFile(outputPath);
    await safeUnlink(inputPath);
    await safeUnlink(outputPath);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    res.setHeader("Content-Disposition", `attachment; filename="converted.docx"; filename*=UTF-8''${encodeURIComponent(outputName)}`);
    return res.send(buffer);
  } catch (error) {
    console.error(`❌ PDF-to-Word Error: ${error.message}`);
    console.error(error.stack);
    await safeUnlink(inputPath);
    await safeUnlink(`${inputPath}.docx`);

    return res.status(500).json({
      error: error?.message || "PDF to Word conversion failed. Ensure Python dependencies are installed."
    });
  }
});

app.post("/api/convert/word-to-pdf", upload.single("file"), async (req, res) => {
  const uploadedPath = req.file?.path;
  let inputPath = uploadedPath;

  try {
    if (!req.file) {
      console.log("❌ Word-to-PDF: No file provided");
      return res.status(400).json({ error: "A Word file is required." });
    }

    const originalName = req.file.originalname || "converted.docx";
    console.log(`📄 Word-to-PDF: Processing ${originalName}`);
    
    const lower = originalName.toLowerCase();
    if (!lower.endsWith(".doc") && !lower.endsWith(".docx")) {
      await safeUnlink(uploadedPath);
      console.log(`❌ Word-to-PDF: Invalid file type: ${originalName}`);
      return res.status(400).json({ error: "Only .doc/.docx files are supported." });
    }

    inputPath = await ensureInputWithExtension(uploadedPath, originalName);
    console.log(`🔧 Word-to-PDF: File path with extension: ${inputPath}`);

    const outputPath = `${inputPath}.pdf`;
    const outputName = `${path.parse(originalName).name}.pdf`;

    console.log(`⚙️  Word-to-PDF: Starting conversion...`);
    try {
      await runPythonConverter("word-to-pdf", inputPath, outputPath);
      console.log(`✅ Word-to-PDF: Python conversion complete`);
    } catch (pythonError) {
      console.warn(`⚠️  Word-to-PDF Python failed: ${pythonError?.message}`);
      console.log("↪ Trying LibreOffice fallback for Word->PDF...");
      try {
        await runSofficeConverter(inputPath, outputPath, "pdf");
        console.log("✅ Word-to-PDF: LibreOffice fallback complete");
      } catch (officeError) {
        throw new Error(
          `Both conversion engines failed. Python: ${pythonError?.message || "unknown"}. LibreOffice: ${officeError?.message || "unknown"}.`
        );
      }
    }

    const buffer = await fs.readFile(outputPath);
    await safeUnlink(inputPath);
    await safeUnlink(outputPath);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="converted.pdf"; filename*=UTF-8''${encodeURIComponent(outputName)}`);
    return res.send(buffer);
  } catch (error) {
    console.error(`❌ Word-to-PDF Error: ${error.message}`);
    console.error(error.stack);
    await safeUnlink(inputPath);
    await safeUnlink(`${inputPath}.pdf`);

    return res.status(500).json({
      error: error?.message || "Word to PDF conversion failed. Ensure Python dependencies are installed."
    });
  }
});

app.post("/api/ai-insights", async (req, res) => {
  if (!openai) {
    return res.status(500).json({
      error:
        "OPENAI_API_KEY is missing. Create a .env file from .env.example and add your API key.",
    });
  }

  const { workbookName, sheetName, summary } = req.body ?? {};

  if (!workbookName || !sheetName || !summary) {
    return res.status(400).json({
      error: "Workbook name, sheet name, and summary payload are required.",
    });
  }

  try {
    const response = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content:
            "You are a professional business analyst. Produce concise executive-ready spreadsheet insights using only the provided workbook summary. Do not fabricate facts. If data quality is limited, say so briefly and continue with the strongest grounded observations. Respond with valid JSON in this exact format: {\"executive_summary\": \"string\", \"key_insights\": [\"string1\", \"string2\", \"string3\"], \"risks_and_opportunities\": [\"string1\", \"string2\"], \"recommended_actions\": [\"string1\", \"string2\"]}",
        },
        {
          role: "user",
          content: JSON.stringify(
            {
              workbook_name: workbookName,
              active_sheet: sheetName,
              analysis_summary: summary,
            },
            null,
            2
          ),
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    if (!response.choices || !response.choices[0] || !response.choices[0].message) {
      return res.status(502).json({
        error: "The AI service returned an invalid response.",
      });
    }

    const content = extractJsonObject(response.choices[0].message.content);
    let insights;

    try {
      insights = JSON.parse(content);
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", content);
      return res.status(502).json({
        error: "The AI service returned invalid JSON.",
      });
    }

    return res.json({
      model,
      insights,
    });
  } catch (error) {
    console.error("AI insight generation failed:", error);

    return res.status(500).json({
      error:
        error?.message ||
        "Something went wrong while generating AI insights.",
    });
  }
});

app.use((error, _req, res, _next) => {
  const tooLarge = error.code === "LIMIT_FILE_SIZE" || error.type === "entity.too.large";
  res.status(tooLarge ? 413 : 400).json({
    error: tooLarge ? "The file is too large. Maximum document size is 50 MB." : "Invalid conversion request. Please select one supported file.",
  });
});

// 404 handler - must come after all routes
app.use((_req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

app.listen(port, () => {
  console.log(`✅ AI server listening on http://localhost:${port}`);
  console.log(`   Conversion endpoints ready: /api/convert/pdf-to-word, /api/convert/word-to-pdf`);
  console.log(`   AI endpoint ready: /api/ai-insights`);
});
