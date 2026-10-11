# Development

[Documentation Home](../README.md)

## Prerequisites

- Node.js compatible with Vite 7: 20.19+ or 22.12+; use a maintained compatible
  release. npm is required.
- Python 3 for document conversion; Python 3.12 was verified locally with
  [the pinned requirements](../python/requirements.txt). Newer Python versions
  are not automatically guaranteed compatible with those native packages.
- A modern browser; Chromium is used by the regression suite.
- Optional Microsoft Word for docx2pdf, or LibreOffice with `soffice` on PATH,
  for higher-fidelity Word conversion and legacy DOC inputs.
- Firebase CLI and a Firebase project only when deploying static hosting.

Neither an OpenAI key nor Firebase SDK configuration is needed to use the
dashboard, images, comparison, JWT decoder, or local conversion service.

## Installation

From the workspace root:

```powershell
cd client
npm.cmd ci
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r python\requirements.txt
.\.venv\Scripts\python.exe python\setup_ocr.py
npm.cmd run dev
```

If Windows exposes Python through the launcher instead, use
`py -3.12 -m venv .venv`. There is no need to activate the virtual environment:
Express detects its interpreter automatically.

macOS/Linux, from `client`:

```sh
npm ci
python3 -m venv .venv
./.venv/bin/python -m pip install -r python/requirements.txt
./.venv/bin/python python/setup_ocr.py
npm run dev
```

The dashboard and browser-only tools can run with `npm run dev:ui` alone;
PDF/Word conversion needs `dev:api` as well.

OCR setup installs a pinned, SHA-256-verified English Tesseract model into
`.ocr/tessdata/`. Current PyMuPDF wheels perform OCR in-process; this setup
was verified without a separate Tesseract binary. Existing English data in
`TESSDATA_PREFIX` or detected system directories is also supported. Native
text needs no OCR data unless Force is selected. Provision the model on the
actual backend, not only a developer machine.

## Environment Configuration

The backend loads `client/.env` by an absolute path derived from
`server.mjs`, not the shell's current directory. Existing process environment
values take precedence over dotenv defaults. Create the file locally only for
settings you need; there is currently no committed `.env.example`.

| Variable | Consumer | Default / use |
| --- | --- | --- |
| `PORT` | Express | `8787`; Vite's dev proxy is separately fixed to 8787 |
| `PYTHON_BIN` | Express | Optional executable path; first runtime candidate |
| `TESSDATA_PREFIX` | Python OCR | Optional tessdata directory containing `eng.traineddata`; local/system fallbacks are supported |
| `OPENAI_API_KEY` | Express | Optional experimental AI credentials; keep server-side |
| `OPENAI_MODEL` | Express | `gpt-4o-mini` in current source |
| `VITE_API_BASE_URL` | Vite frontend | Empty; document requests use same-origin `/api/convert/*` |

Example non-secret settings:

```dotenv
PORT=8787
# Optional override; prefer automatic .venv detection for local development.
# PYTHON_BIN=C:/path/to/python.exe
# For a separately hosted document API, set the origin, not an /api path.
# VITE_API_BASE_URL=https://api.example.com
```

Never prefix credentials with `VITE_`: those variables are exposed to the
browser bundle. Do not commit secrets. Only plain `.env` and files ending
in `.local` are currently ignored; review ignore rules before creating other
environment filenames. Use deployment environment/secret storage for production.

Restart Express after changing server variables. Restart Vite after changing
frontend variables; rebuild for production. `VITE_API_BASE_URL` currently
affects document conversion only, not a future AI integration automatically.

## Local Routing

| Service | Default address | Notes |
| --- | --- | --- |
| Vite | `http://localhost:5173` | May choose another port if occupied |
| Express | `http://localhost:8787` | Health at `/api/health` |
| Vite proxy | `/api/*` to Express :8787 | Development-only |
| Built preview | Usually `http://localhost:4173` | No API proxy configured |

Use `npm.cmd run dev` for both services. Keep it running while testing.
Changing API `PORT` alone breaks the existing Vite proxy; also update its
target or set an explicit frontend API origin. On Windows CMD, use `cls`
to clear the terminal; `clear` is not a CMD command.

Health check in PowerShell:

```powershell
Invoke-RestMethod http://localhost:8787/api/health
```

`aiConfigured: false` is expected without an AI key and does not disable
conversion. The health response proves neither key validity nor converter
readiness; test a real document.

## Verification

From `client` on Windows:

```powershell
npm.cmd run lint
npm.cmd run check:syntax
npm.cmd run check:docs
npm.cmd run build
node --check server.mjs
.\.venv\Scripts\python.exe -m py_compile python\convert_tool.py
.\.venv\Scripts\python.exe -m unittest discover -s python/tests -v
npx.cmd playwright install chromium
npm.cmd run test:tools
npm.cmd run test:smoke
```

Use `npm`/`npx` and `./.venv/bin/python` on macOS/Linux. Playwright may
also need browser system dependencies on Linux; consult its installation docs.
The Python compile check validates syntax only, not installed libraries or
conversion fidelity.

The Playwright config starts UI on 5190 and a private API on 8791. It uses one
worker; the UI server can be reused, but the API is expected to be started by
the suite. Keep these ports available. Real-conversion tests explicitly route
requests to the test API instead of depending on the normal :8787 proxy.

The browser tool suite has 33 tests covering JWT Unicode and reset/copy behavior,
text diff and size guards, image rotation/crop/ICO/JPEG output, document
validation/error/stale-result behavior, modal keyboard/focus/metadata lifecycle,
native/scanned PDF-to-DOCX and DOCX-to-PDF content, visual cropping/history,
drop upload, mobile dark-mode layout, preserved default pixels, expanded image/
document/sheet previews, guarded workspace switching (including browser Back),
local takeaways following reporting selections, and preview/
download byte equality across image formats. Python dependencies and OCR data
are required for the real scanned-PDF test.
Twelve Python tests separately verify native/scanned/mixed/forced-OCR,
missing-model rejection, editable tables, and the Word-to-PDF text/table
fallback with Office and LibreOffice disabled. Fallback checks cover missing
or unnamed paragraph styles, pagination, literal markup, and error diagnostics.
They run even on Windows so an installed Word application cannot mask failures
that would otherwise appear only on the Linux CI runner.

Useful focused runs:

```powershell
npm.cmd run test:tools -- --grep-invert real
npm.cmd run test:tools -- --grep real
```

Interaction tests do not prove server conversion works. Real-conversion tests
assert extracted content, not pixel-perfect layout. Two additional built-app
smoke tests cover uploads, sheet/metric/chart controls, reset, theme, routes,
and assets. They use `playwright.smoke.config.mjs` and preview port 5192
without an API. Run them after building.

Reports are separated under `playwright-report/tools` and
`playwright-report/smoke`; failure artifacts use matching `test-results`
subdirectories. Under CI, focused tests are forbidden and server reuse is
disabled. There is no full analytics edge-case suite, accessibility audit, or
hosted smoke suite. `test-server.js` and `test-diagnostic.mjs` remain empty
stubs, not a substitute for Playwright.

The [production pipeline](CI_CD.md) runs these checks before Firebase Hosting
deployment on prod. Credentials and protection are GitHub settings, not local
environment files.

ESLint's configured file coverage is JS/JSX; use Node syntax checks for MJS
files and Python checks separately. Generated `dist/`, `.venv/`,
`test-results/`, `playwright-report/`, `.ocr/`, and `__pycache__/` are ignored.
Record warnings and test gaps rather than claiming unrun checks passed.

## Troubleshooting

| Symptom | Check / action |
| --- | --- |
| Empty/non-JSON API response | Ensure Express is running and the dev proxy targets its port; inspect status and content type before parsing |
| Conversion unavailable on Firebase/preview | Static SPA fallback may return HTML for `/api`; deploy/configure a backend, not a localhost retry |
| Python missing/module error | Install requirements into the project's `.venv`; inspect `PYTHON_BIN` if set |
| DOC conversion fails | Install/configure an office engine; Python's simple fallback does not parse binary DOC |
| Output layout differs | Try Word/LibreOffice; simplified PDF rendering cannot preserve all formatting |
| Scanned PDF has no editable text | Run `python/setup_ocr.py` with the backend interpreter; try OCR every page for partial text layers and review scan quality |
| Client timeout | Try a smaller input; inspect backend engine logs and infrastructure timeouts |
| `aiConfigured: false` | Normal; local workbook takeaways do not use AI. If directly testing AI, set the key on the server and restart |
| Experimental AI reports quota/billing error | Credentials alone do not establish usable provider quota; ordinary analytics/tools do not need AI |
| Clipboard fails | Check secure context, permissions, and browser clipboard support |
| Stale workbook after route change | State is intentionally not persisted; returning requires another upload |
| Browser compatibility-data warning | Separate tooling advisory, not evidence that the API or converters failed |

The backend logs request paths, filenames, runtime attempts, and errors.
Do not publish logs containing private filenames, document content, or secrets.

## Making Changes

Start with the [Architecture](ARCHITECTURE.md) source map. Preserve existing
CSS/theming and component patterns; prefer pure helpers for transformations.

For a dashboard metric/chart, update `workbook.js` and/or the builder series
in Dashboard, and test both default summaries and selected reporting controls.
Check cleaning, mixed types, missing values, duplicates, negatives, dates,
and chart truncation against known totals.

For a tool, register its catalogue entry in EasyMadeConversions and its modal
dispatch in ToolModal. Define supported types/limits, local/server boundaries,
reset rules, accessible labels, and test cases. Reuse DocumentConverter and
conversion helpers for document modes rather than duplicating fetch logic.

For an API change, keep JSON errors consistent, validate uploads on the server,
retain temporary-file cleanup, and update [API Reference](API.md). Before
enabling AI, add consent/privacy handling, schema validation, provider failure
handling, abuse controls, and UI tests; the current endpoint is experimental.

Update README status and the relevant guides whenever routes, defaults,
limits, dependencies, data flow, or deployment behavior change. The Git root
is `client`; parent workspace docs are outside it. Review the diff, lint,
build, run relevant tests, and document what was actually verified.
