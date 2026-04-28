import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
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

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    aiConfigured: Boolean(process.env.OPENAI_API_KEY),
    model,
  });
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

app.listen(port, () => {
  console.log(`AI server listening on http://localhost:${port}`);
});
