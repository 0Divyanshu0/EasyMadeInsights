# EasyMadeInsights

EasyMadeInsights is a browser-based spreadsheet dashboard with an accompanying
utility workspace, **EasyMadeConversions**. Users can inspect tabular data,
choose reporting dimensions and chart styles, and access document, image,
text-comparison, and JWT tools.

This documentation describes the current implementation, not planned features.
Workbook takeaways run locally and follow the selected metric and grouping.
An optional experimental AI API remains in the backend, but the dashboard does
not call it and has no API-key requirement.

## Documentation

| Guide | Contents |
| --- | --- |
| [User Guide](docs/USER_GUIDE.md) | Uploads, dashboard controls, all five tools, limits, and interpreting results |
| [Architecture](docs/ARCHITECTURE.md) | Source map, runtime boundaries, state, and processing flows |
| [Development](docs/DEVELOPMENT.md) | Installation, configuration, commands, tests, troubleshooting, and contribution workflow |
| [API Reference](docs/API.md) | Health, document conversion, experimental AI, and error contracts |
| [Deployment](docs/DEPLOYMENT.md) | Firebase Hosting, separate conversion backend, security, and release checks |
| [Production Pipeline](docs/CI_CD.md) | prod branch, quality/test/build gates, GitHub credentials, and automated Hosting release |

## Current Capabilities

| Capability | Status | Processing location |
| --- | --- | --- |
| Excel, CSV, TSV, and JSON upload | Implemented | Browser |
| Sheet selection, KPI cards, and cleaned-data preview | Implemented | Browser |
| Metric, breakdown, trend, and comparison controls | Implemented | Browser |
| Bar, line, area, column, and donut views | Implemented | Browser |
| Selected-metric workbook takeaways | Implemented; full cleaned-data totals, leading groups, review prompts; not AI-generated | Browser |
| Expanded previews | Searchable, paginated full-sheet modal; fit/full-size document and image modals | Browser |
| Light/dark theme and branded welcome overlays | Implemented | Browser; theme saved locally |
| PDF to editable DOCX, including English scan OCR | Requires backend/Python and OCR language data for scans | Server |
| DOC/DOCX to PDF | Requires conversion backend; legacy DOC needs a suitable office engine | Server |
| Photo studio: visual crop, flips, tones, undo/redo, PNG/JPG/WebP/ICO export | Implemented | Browser |
| Text/file comparison | Implemented for supported text formats | Browser |
| JWT header/payload decoding | Implemented; no signature verification | Browser |
| Experimental AI endpoint | Backend only; no dashboard integration | Optional server/provider |
| Accounts, cloud saves, saved report presets, and report export | Not implemented | Not applicable |

## Quick Start

Run commands from this `client` directory. Install Node.js compatible with
Vite 7 (Node 20.19+ or 22.12+); see the [Vite 7 announcement](https://vite.dev/blog/announcing-vite7)
for its runtime requirements.

```powershell
npm.cmd ci
npm.cmd run dev
```

Open `http://localhost:5173/`. The same command starts Express on
`http://localhost:8787`. On macOS/Linux, use `npm` instead of `npm.cmd`.
No API key is needed for the dashboard or conversion tools.

Document conversion additionally needs Python and its dependencies. Python
3.12 is the locally verified version for the pinned requirements:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r python\requirements.txt
.\.venv\Scripts\python.exe python\setup_ocr.py
```

OCR setup installs a checksum-verified official English Tesseract model into
ignored `.ocr/tessdata/`. Provision it on each backend; no paid AI key or
external document upload is needed for OCR.
The backend automatically looks for this virtual environment. Activation is
not required. Office/LibreOffice engines improve Word-to-PDF layout fidelity;
the Python fallback provides a simpler text-and-table rendering. See
[Development](docs/DEVELOPMENT.md) for cross-platform setup and prerequisites.

A demonstration workbook is available at
[public/easy-made-insights-demo.xlsx](public/easy-made-insights-demo.xlsx),
served locally as `/easy-made-insights-demo.xlsx`. The bundled
[demo PDF](public/easy-made-insights-demo.pdf) is for the conversion tool,
not the spreadsheet uploader.

## Technology

| Layer | Technologies and responsibility |
| --- | --- |
| UI | React 18, React Router 7, custom CSS, browser APIs |
| Analytics | SheetJS `xlsx`, application-specific cleaning and aggregation, Recharts 3 |
| API | Node.js ES modules, Express 5, Multer, CORS, dotenv |
| Document processing | PyMuPDF native text/Tesseract OCR, pdfplumber tables, python-docx, docx2pdf, ReportLab; optional LibreOffice for Word-to-PDF |
| DOCX preview | `docx-preview`; PDF preview uses the browser's native viewer |
| Experimental AI | OpenAI SDK and Chat Completions; dashboard integration is inactive |
| Development | Vite 7, concurrently, ESLint, Playwright |
| Static hosting | Firebase Hosting; no Firebase database/authentication SDK |

[package.json](package.json), [package-lock.json](package-lock.json), and
[python/requirements.txt](python/requirements.txt) are the dependency sources
of truth. The React 19 type packages do not change the React 18 runtime.
Some declared document packages are used by tests or retained from earlier
implementation paths; see the architecture guide.

## Commands

| Command, from `client` | Purpose |
| --- | --- |
| `npm.cmd run dev` | Start frontend and API together |
| `npm.cmd run dev:ui` | Start only Vite |
| `npm.cmd run dev:api` | Start only Express |
| `npm.cmd run lint` | Lint configured JavaScript/JSX sources |
| `npm.cmd run check:syntax` | Check backend/config/test/helper ES module syntax |
| `npm.cmd run check:docs` | Validate documentation links, examples, and command references |
| `npm.cmd run build` | Generate the frontend in `dist/` |
| `npm.cmd run preview` | Preview the build; does not start or proxy the API |
| `npm.cmd run test:tools` | Run the conversion/utility browser regression suite |
| `npm.cmd run test:smoke` | Test the built dashboard, routes, and assets after building |

The parent workspace's `package.json` forwards `dev`, `lint`, `build`,
and `preview` to `client`. Dependencies must still be installed in
`client`. For tests from the parent directory, use
`npm.cmd --prefix client run test:tools`.

## Data and Interpretation

Uploaded workbooks remain in browser memory in the current dashboard flow.
They are not stored in a database or automatically sent to the AI endpoint.
Image conversion, text comparison, and JWT decoding also run locally.
Document conversion uploads the selected document to Express for temporary
server-side processing.

Automatic cleaning removes duplicate rows and fills missing values. Results
therefore describe the **cleaned dataset**, not a lossless audit of the source.
Charts show bounded subsets, currency-like names use USD formatting, and type
detection is heuristic. Review the [User Guide](docs/USER_GUIDE.md) before using
results for decisions.

Workbook state is not persisted. Refreshing, closing the tab, resetting, or
confirming a workspace switch loses the loaded dashboard session. Internal
switches between Insights and Conversions, including browser Back/Forward,
require confirmation; cancelling retains the current session. Conversions
shows only a return link, not spreadsheet section navigation. A separate
browser leave-page warning is registered while a workbook is loaded; its
wording/display are controlled by the browser. These are routes on one site,
not independently hosted subdomains.

## Deployment and Readiness

[firebase.json](firebase.json) deploys only `dist/` and rewrites unknown paths
to the SPA. It does **not** deploy `server.mjs`, Python, or an API proxy.
Document conversion requires a separately provisioned backend and either
`VITE_API_BASE_URL` at build time or an API rewrite before the SPA fallback.

The backend currently has no authentication, rate limiting, concurrency queue,
or production-ready isolation of conversion processes. Health checks do not
verify conversion engines. Public API deployment needs additional safeguards
described in [Deployment](docs/DEPLOYMENT.md).

The Playwright suites cover tools, real PDF/DOCX conversions, and built-dashboard
smoke checks. Deeper analytics, accessibility, and hosted production checks still
need additional coverage. The [production pipeline](docs/CI_CD.md) validates PRs
into `prod` and deploys successful prod pushes to Firebase Hosting after all
gates. GitHub credentials/environment/branch protection must be configured before
use. There is no Docker deployment, Firebase Functions implementation, or license
file in this checkout.
