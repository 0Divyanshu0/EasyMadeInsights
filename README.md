# EasyMadeInsights - Data Insights Made Simple

EasyMadeInsights is a Vite + React application for turning spreadsheets into quick business dashboards. It supports workbook upload, sheet analysis, KPI cards, interactive charts, an upcoming AI summary experience, and a set of file conversion/developer tools.

## Features

### Core Analytics

- Upload `.xlsx`, `.xls`, `.csv`, `.tsv`, and `.json` files.
- Clean spreadsheet rows, remove duplicates, and fill missing values.
- Detect numeric, category, and date columns.
- Generate KPIs, data previews, chart summaries, trend views, and local narrative insights.
- Prepare for upcoming AI executive summaries through the local Express API.

### EasyMadeConversions Tools

- PDF to Word converter.
- Word to PDF converter.
- Image converter for JPG, PNG, and favicon outputs.
- File comparison with highlighted changes.
- JWT decoder.

## Tech Stack

| Category | Technology | Purpose |
|----------|------------|---------|
| Frontend | React 18.3.1 + Vite | SPA UI and fast local development |
| Routing | React Router | Client-side page navigation |
| Styling | Custom CSS | Theme and component styling |
| Charts | Recharts | Dashboard visualizations |
| Data Processing | SheetJS (`xlsx`) | Excel, CSV, TSV, and JSON parsing |
| Backend | Node.js + Express | Local API server for upcoming AI summaries |
| AI | OpenAI API | Planned business insight generation |
| Document Tools | `mammoth`, `jspdf`, `pdfjs-dist`, `docx` | Browser-side document conversion |
| Deployment | Firebase Hosting | Static app hosting |
| Development | ESLint, Concurrently | Code quality and parallel dev servers |

## Project Structure

```text
client/
  public/                  Static assets and demo files
  src/
    components/            Reusable UI components
    components/tools/      Conversion and developer tools
    pages/                 Main route pages
    styles/                CSS files
    utils/workbook.js      Spreadsheet analysis helpers
  server.mjs               Express API for AI insights
  vite.config.js           Vite config and API proxy
  firebase.json            Firebase Hosting config
```

## Local Setup

```bash
npm install
npm run dev
```

The UI runs through Vite and the API runs from `server.mjs`.

- Frontend: `http://localhost:5173`
- API: `http://localhost:8787`

## Environment Variables

Create `client/.env` with:

```text
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-4o-mini
PORT=8787
```

Do not commit real API keys. If a key was committed or shared, rotate it before using the project publicly.

## Production Build

```bash
npm run build
npm run preview
```
