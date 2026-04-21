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
const model = process.env.OPENAI_MODEL || "gpt-5.4-mini";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

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
    const response = await openai.responses.create({
      model,
      reasoning: { effort: "low" },
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text:
                "You are a professional business analyst. Produce concise executive-ready spreadsheet insights using only the provided workbook summary. Do not fabricate facts. If data quality is limited, say so briefly and continue with the strongest grounded observations.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: JSON.stringify(
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
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "sheet_ai_insights",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              executive_summary: { type: "string" },
              key_insights: {
                type: "array",
                items: { type: "string" },
                minItems: 3,
                maxItems: 3,
              },
              risks_and_opportunities: {
                type: "array",
                items: { type: "string" },
                minItems: 2,
                maxItems: 2,
              },
              recommended_actions: {
                type: "array",
                items: { type: "string" },
                minItems: 2,
                maxItems: 2,
              },
            },
            required: [
              "executive_summary",
              "key_insights",
              "risks_and_opportunities",
              "recommended_actions",
            ],
          },
        },
      },
    });

    if (!response.output_text) {
      return res.status(502).json({
        error: "The AI service returned an empty response.",
      });
    }

    return res.json({
      model,
      insights: JSON.parse(response.output_text),
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
