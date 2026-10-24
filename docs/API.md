# API Reference

[Documentation Home](../README.md)

Implementation: [server.mjs](../server.mjs). Default local origin:
`http://localhost:8787`. The API is separate from Firebase Hosting.

## Conventions

There is currently **no authentication or rate limiting**. CORS is enabled
with permissive defaults. These are development behaviors, not a security
contract for a public conversion or AI service.

Health/AI success responses and error responses use JSON. Conversion success
responses are binary attachments. Errors generally have this shape:

```json
{ "error": "Human-readable explanation." }
```

JSON request bodies are limited to 1 MiB. Conversion uploads accept a single
multipart field named `file`, limited to 50 MiB. Do not manually set the
Content-Type boundary when using browser FormData or curl's `-F`.

## GET /api/health

Returns HTTP 200:

```json
{
  "ok": true,
  "aiConfigured": false,
  "model": "gpt-4o-mini"
}
```

`model` reflects `OPENAI_MODEL` or the source default.
`aiConfigured` only checks that `OPENAI_API_KEY` is present. It does not
validate credentials, quota, provider availability, Python packages, office
engines, or successful document conversion. An unconfigured AI key does not
prevent document tools from working.

```powershell
curl.exe http://localhost:8787/api/health
```

## POST /api/convert/pdf-to-word

Send a nonempty PDF with a `.pdf` filename:

```powershell
curl.exe --fail-with-body -X POST http://localhost:8787/api/convert/pdf-to-word -F "file=@public/easy-made-insights-demo.pdf" -o converted.docx
```

Run the example from `client`; on macOS/Linux use `curl`. Check curl's
exit status before opening the output: an error body may be written to that
path instead of a document.

Successful response:

| Field | Value |
| --- | --- |
| Status | 200 |
| Content-Type | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` |
| Content-Disposition | Attachment with fallback filename and UTF-8 `filename*` |
| Body | DOCX bytes |

Optional multipart field `ocrMode` is `auto` (default) or `force`.
Auto extracts native text/tables and uses English OCR for detected scans.
Force OCRs all pages to recover incomplete text layers. Invalid modes return
400. Inputs are limited to 100 pages in addition to the upload limit.

The service builds Word paragraphs/cells and rejects image-only results.
There is no PDF-to-DOCX LibreOffice fallback. Scan OCR requires language data
installed using `python/setup_ocr.py` or an existing tessdata directory.
Accuracy, reading order, and layout are best effort; forced OCR does not keep
native table/style fidelity. Unlock password-protected PDFs first.

## POST /api/convert/word-to-pdf

Send a nonempty Word document with a `.docx` or `.doc` filename:

```powershell
curl.exe --fail-with-body -X POST http://localhost:8787/api/convert/word-to-pdf -F "file=@example.docx" -o converted.pdf
```

Successful response:

| Field | Value |
| --- | --- |
| Status | 200 |
| Content-Type | `application/pdf` |
| Content-Disposition | Attachment with fallback filename and UTF-8 `filename*` |
| Body | PDF bytes |

Conversion uses an office engine when available, otherwise simplified DOCX
text/table rendering. Legacy DOC requires a compatible office engine.

### Shared Conversion Behavior

The browser enforces extension, nonempty content, and size before upload.
The server separately enforces upload size and filename extension, but does
not implement comprehensive content sniffing or malware scanning on input.
Invalid/misnamed documents may reach an engine and fail with HTTP 500.

Uploads are written under the OS temporary directory in
`easymadeinsights_uploads`. Success and caught failures attempt input/output
cleanup; crash/timeout cleanup and retention are not guaranteed. Results are
buffered in server memory before returning.

Each top-level child-process invocation has a 90-second timeout. Multiple
runtime/engine attempts can exceed that total. The browser's complete request
timeout is 120 seconds. Infrastructure limits can be shorter. Aborting a
client request does not implement server-side worker cancellation.

The frontend validates MIME type plus PDF `%PDF-` or DOCX ZIP `PK`
signature bytes before exposing a download. `application/octet-stream` is
accepted only with the expected signature. This rejects SPA HTML fallbacks;
it is not a full integrity/security validation of the document.

## POST /api/ai-insights

**Experimental endpoint; not connected to Workbook takeaways or the dashboard.**
It requires a configured server-side OpenAI key. Do not expose it publicly
without authentication, abuse controls, and a privacy review.

Content-Type: `application/json`.

```json
{
  "workbookName": "sales.xlsx",
  "sheetName": "Sales",
  "summary": {
    "row_count": 2,
    "primary_metric": "Revenue",
    "metric_summary": { "total": 2100, "average": 1050 }
  }
}
```

All three top-level fields must be truthy; the server does not enforce a
complete schema or validate numerical claims in `summary`. The helper
`buildAiInsightPayload` in workbook.js supplies a richer proposed payload,
including preview rows, but Dashboard does not call it.

The server sends the supplied context to OpenAI Chat Completions with the
configured model, a business-analysis prompt, temperature 0.7, and a 1,000-token
output budget. The prompt requests JSON with these fields:

```json
{
  "model": "gpt-4o-mini",
  "insights": {
    "executive_summary": "Summary text",
    "key_insights": ["Observation"],
    "risks_and_opportunities": ["Risk or opportunity"],
    "recommended_actions": ["Next step"]
  }
}
```

This is the **intended** success shape, not a guaranteed validated schema.
The implementation strips possible fences/text and uses JSON.parse. It does
not use API-enforced Structured Outputs, validate every field, or prevent
hallucinations. Any consumer must add validation before trusting/rendering it.

## Status Codes

| Status | Current conditions |
| --- | --- |
| 200 | Health, successful binary conversion, or parsed AI response |
| 400 | Missing file, unsupported extension, missing AI fields, malformed JSON, or upload middleware error |
| 404 | Unmatched Express endpoint |
| 413 | File exceeds 50 MiB or JSON exceeds 1 MiB |
| 500 | Conversion/runtime failure, missing AI key, or caught provider/SDK failure |
| 502 | AI response lacks the expected message or cannot be parsed as JSON |

Provider errors such as upstream quota HTTP 429 are currently returned by this
API as HTTP 500 with the provider message. There is no automatic retry policy
implemented by the application. Middleware error messages are generic and
conversion-oriented, even for some JSON/AI request failures; do not infer
precise failure categories from wording alone.

## Configuration and Operations

See [Development](DEVELOPMENT.md#environment-configuration) for variables and
restart rules, [Architecture](ARCHITECTURE.md#document-conversion-pipeline)
for worker order, and [Deployment](DEPLOYMENT.md) for production routing and
security requirements. Static Hosting's HTML response is not an API success,
even if its HTTP status is 200.
