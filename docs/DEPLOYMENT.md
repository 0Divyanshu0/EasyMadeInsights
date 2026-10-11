# Deployment

[Documentation Home](../README.md)

## Deployment Model

The committed [firebase.json](../firebase.json) hosts `dist/` and rewrites
unknown paths to `/index.html`. [.firebaserc](../.firebaserc) selects
`easymadeinsights` as the default project.

| Component | What the current Hosting configuration provides |
| --- | --- |
| React dashboard and catalogue | Static HTML/JS/CSS/assets |
| Spreadsheet, image, diff, JWT processing | Browser functionality |
| Deep links such as `/conversions` | SPA fallback |
| Express/Python document conversion | Not deployed or routed |
| Experimental AI API | Not deployed or routed |
| Authentication, Firestore, Storage, Functions | Not implemented |

A Hosting-only release can analyze workbooks and run browser tools. The document
tools still need a backend; otherwise requests can receive the SPA HTML instead
of a document. The client rejects that response and displays unavailable.
Starting a backend on your own laptop does not make it available to site visitors.

## Firebase Hosting Setup

Run these commands from `client` after installing a compatible Node/npm runtime:

```powershell
npm.cmd ci
npm.cmd install -g firebase-tools
firebase.cmd login
firebase.cmd projects:list
```

On macOS/Linux use `npm` and `firebase`. Confirm the project identifier
and your account's deployment access. To use the existing configured project:

```powershell
firebase.cmd use easymadeinsights
```

For another project, select its actual project ID instead and review the
resulting `.firebaserc` changes. Do not accidentally deploy to the wrong
project. API keys and Firebase web SDK settings are unnecessary for static
Hosting in this app.

Hosting is already initialized in this repository; there is no need to run
`firebase init` again. For a clean reinitialization, select the existing
project, Hosting, public directory `dist`, and SPA rewrites. Do not overwrite
the application's `index.html` or configure CI unless you intend to add it.
See the [official Hosting quickstart](https://firebase.google.com/docs/hosting/quickstart).

## Build and Release

The preferred automated path is the [Production Pipeline](CI_CD.md): PR into
`prod`, pass quality/regression/build/artifact checks, merge, then deploy the
verified artifact to Hosting. Configure GitHub's prod environment and service
account first. The commands below remain a manual release path; restrict manual
deployment credentials/access so it does not become a routine bypass of gates.

From `client`:

```powershell
npm.cmd run lint
npm.cmd run build
firebase.cmd emulators:start --only hosting
```

Inspect the emulator URL printed by the CLI and verify deep links and assets.
The emulator serves the built files; rebuild after changing source or frontend
environment values. `npm run preview` is also a static build preview and
does not provide the development API proxy.

After stopping the emulator and confirming the intended project:

```powershell
firebase.cmd deploy --only hosting
```

The CLI prints the deployed site URL. For the current default project, the
expected Hosting origin is `https://easymadeinsights.web.app`; verify it in
the CLI/console rather than assuming a deploy succeeded.

## Enabling Document Conversion

This repository does not include a Dockerfile, Cloud Run deployment manifest,
Firebase Function, or API Hosting rewrite. Backend provisioning is a separate
task; `firebase deploy --only hosting` does not perform it.

A suitable backend runtime must provide:

- Node dependencies, `server.mjs`, and the `python/` source directory.
- A compatible Python interpreter with `python/requirements.txt` installed.
- English OCR data for scans, provisioned using `python/setup_ocr.py` during
  backend installation/image build, or an existing tessdata directory. The
  frontend Hosting artifact does not include the model.
- Optional LibreOffice and required fonts; Microsoft Word-based conversion is
  not an assumption for a Linux/cloud container.
- Writable temporary storage, enough RAM for input/output buffers and workers,
  and monitored resource/concurrency limits.
- HTTPS access and a platform-provided `PORT`, or correctly configured
  reverse proxy to Express.
- An upload/request timeout compatible with conversion; platform/proxy limits
  can reduce the application's advertised 50 MiB/two-minute client limits.

The server's `npm run dev:api` script runs `node server.mjs` and respects
`PORT`. Do not deploy `npm run dev` or the Vite dev server as a production
web server. Install frontend development dependencies wherever the Vite build
runs; a production-only dependency installation cannot run that build.

### Option A: Separate HTTPS API Origin

Once the backend exists, set a non-secret frontend build variable. Example
`client/.env.production.local`:

```dotenv
VITE_API_BASE_URL=https://api.example.com
```

Replace the example origin with your deployed backend, without a trailing
`/api` path. Build and redeploy Hosting. Document requests then target
`https://api.example.com/api/convert/...`.

Changing the backend's environment alone does not change an existing frontend
bundle. Ensure the API's CORS policy permits the site origin. Current permissive
CORS is not adequate protection against public misuse. This variable currently
configures only document requests; enabling AI later requires its own wiring.

### Option B: Same-Origin API Rewrite

For a separately deployed Cloud Run service, Firebase Hosting can route
`/api/**` to that service. Add the API rule **before** the catch-all SPA
rule. This is an illustrative hosting section, not the current committed config:

```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "/api/**",
        "run": {
          "serviceId": "YOUR_CONVERSION_SERVICE",
          "region": "YOUR_SERVICE_REGION"
        }
      },
      { "source": "**", "destination": "/index.html" }
    ]
  }
}
```

Replace placeholders only after creating the service. Preserve the existing
project configuration and confirm service region, permissions, request limits,
billing requirements, and Hosting integration constraints in the
[official Cloud Run integration guide](https://firebase.google.com/docs/hosting/cloud-run).
Container/service packaging and API hardening are not implemented by this
example. Leave `VITE_API_BASE_URL` unset for same-origin requests.

Firebase documents a **60-second Hosting request timeout** for this integration.
Conversions exceeding it can return HTTP 504 even though the browser waits up
to two minutes. For longer jobs, use an appropriately configured direct API
origin or design an asynchronous job/polling workflow; increasing only the
browser timeout cannot fix this. Cloud Run also requires linked Cloud Billing,
which upgrades a Spark Firebase project to Blaze. Review both constraints
before choosing this option. See the
[Cloud Run integration requirements](https://firebase.google.com/docs/hosting/cloud-run).

## Security and Operational Checklist

Before exposing conversion or AI endpoints publicly:

- Add authentication/authorization or deliberate anonymous-use abuse controls;
  restrict CORS, rate-limit requests, cap concurrent jobs, and bound CPU/memory.
- Isolate untrusted conversion inputs/processes; add input sniffing, malware
  scanning where appropriate, and dependency security review.
- Implement worker cancellation and reliable temporary-directory cleanup,
  including crashes/timeouts; define and disclose a retention policy.
- Use unique per-job office output/profile directories to avoid concurrency
  collisions and process interference.
- Sanitize user-facing errors and logs; the current server can return engine
  diagnostics and logs document filenames.
- Store provider credentials in server environment/secret storage, never in
  `VITE_` variables, frontend files, public assets, or committed env files.
- Monitor actual conversion failures, timeouts, memory, and quota; health only
  indicates that Express answers and whether an AI key is present.
- Review HTTPS/security headers/CSP and dependency advisories. No current
  configuration constitutes a full production security or compliance audit.

The experimental AI endpoint remains callable if deployed, although the dashboard has no AI integration.
Keep it disabled/unconfigured or protect it until a deliberate release. No
provider costs are needed for current spreadsheet/browser tools; backend and
hosting platform charges depend on the actual service and usage.

## Release Smoke Checks

| Check | Expected result |
| --- | --- |
| Load `/` and directly open `/conversions` | Correct SPA route, no missing assets |
| Refresh a deep link | Hosting serves the SPA, not a platform 404 |
| Open an unknown path | Client NotFound view |
| Upload demo workbook; switch sheets/controls | KPIs/preview/charts update; values reconciled against cleaned data |
| Refresh with loaded workbook | Browser warning where supported; no recovery claim |
| Switch workspaces, including browser Back/Forward | Confirmation; cancel retains state, confirm opens fresh workspace |
| Theme toggle | Persists across reload |
| Image, comparison, JWT tools | Work without document API or AI key |
| `/api/health` at intended API origin | JSON, not SPA HTML |
| PDF-to-DOCX and DOCX-to-PDF | Valid attachments with real content, or clear errors |
| Replace input during conversion | No stale download/preview |
| Workbook takeaways | Follow selected metric/grouping, full cleaned-data totals, no provider call |
| Expanded previews on desktop/mobile | Entire image fits; DOCX pages scale proportionally, 100% scrolls, nested Escape closes top layer only |

Also test small screens, keyboard navigation, slow/error responses, and browser
download permissions. Playwright local coverage does not replace these hosted
checks.

## Branding, Maintenance, and Rollback

Before a domain change, update the origin in `src/App.jsx`, `index.html`,
`public/robots.txt`, and `public/sitemap.xml`. Review initial social metadata.
Workspace switching is within the SPA; configuring actual independent subdomains
requires separate hosting/routing and a cross-origin session-loss design.
Client-updated metadata is not SSR; crawlers may only read the initial HTML.

The favicon/dashboard welcome use `public/easy-made-insights-logo.png`;
the tools welcome uses `public/EasyMadeConversion_logo.png`.
Public demo assets are accessible to every visitor; do not put private files
in `public/`.

Retain the source revision, lockfile, environment/build settings, test results,
and backend revision for each release. A previous frontend build can be rebuilt
and redeployed, or an available prior Hosting release selected through Firebase.
Rollback the API separately if its contract changed. Secrets are not release
artifacts. The [production pipeline](CI_CD.md) automates quality-gated Hosting
releases from prod; rollback remains a reviewed revert/redeploy or an explicitly
recorded manual Hosting action. Backend releases and rollback are separate.
