# User Guide

[Documentation Home](../README.md)

## Getting Started

Open the dashboard at `/`. Dismiss the branded welcome overlay or wait for
it to close automatically. Use the theme button in the top navigation to switch
light/dark mode; the choice is remembered on this browser.

For a first run, download `/easy-made-insights-demo.xlsx` and select it in
the uploader. Uploading is not the same as saving: files and reports are held in
memory, not in an account or cloud library.

## Spreadsheet Inputs

| Format | Expected content |
| --- | --- |
| `.xlsx`, `.xls` | Workbook with tabular worksheets and a header row |
| `.csv` | Comma-delimited text with headers |
| `.tsv` | Tab-delimited text with headers |
| `.json` | Top-level array of row objects; imported as Sheet1 |

Example JSON:

```json
[
  { "Region": "North", "Revenue": 1200, "Units": 12 },
  { "Region": "South", "Revenue": 900, "Units": 9 }
]
```

Use consistent keys, clear column names, and a rectangular table. Nested JSON,
merged presentation layouts, password-protected files, or sheets with several
unrelated tables are not a supported reporting contract. Prefer lowercase file
extensions: validation is case-insensitive, but some parser branches currently
check lowercase suffixes. PDF files belong in the conversion tools, not here.

Choose a file with the picker or drag/drop one file. Every sheet is parsed,
cleaned, and analyzed; the first sheet becomes active. Use the sheet selector
to change tabs. Parsing failures show an error and clear the loaded workbook.
There is no explicit workbook size cap; large files can exhaust browser memory
or make the page unresponsive. Start with small, structured datasets.

## Dashboard Workflow

1. **Upload:** inspect the selected filename, size, status, and active sheet.
2. **Overview:** review cleaned row count, detected numeric columns, workbook
   sheet count, and the selected metric's total.
3. **Visual Builder:** select the metric and dimensions for the question.
4. **Preview:** inspect the first six cleaned rows/columns and the data profile.
   Choose **Open full sheet preview** for all columns, search, and 25-row pages.
   Long cells wrap; scroll horizontally for wide worksheets.
5. **Insights:** read Workbook takeaways for the selected metric and breakdown:
   total, average, range, leading group, and a practical review prompt. All
   cleaned rows are included, even when charts show only a subset. Shares are
   omitted for negative values or a nonpositive total. No AI key is required.

The sidebar scrolls between these sections on the dashboard. To return from
EasyMadeConversions, use **Back to EasyMadeInsights**. Returning starts a fresh
dashboard; it does not restore the previous workbook.

### Reporting Controls

| Control | Effect |
| --- | --- |
| Metric | Numeric field used for selected-total KPI and builder charts |
| Breakdown | Category/date field used to group performance |
| Trend Axis | Date/category field used to group trend and comparison |
| Comparison Metric | Second numeric field, or None |
| Performance Chart | Bar, line, or donut |
| Trend Chart | Area, line, or columns |

Values are aggregated by **sum**, not user-selectable average/count/min/max.
Charts group equal labels; tooltips show plotted values. Performance is sorted
by descending summed value and displays at most eight groups. Trend and
comparison are sorted by label and display the first twelve groups. Date-like
labels are normalized to ISO dates when parsing succeeds; non-date labels are
lexicographically ordered rather than preserving source order.

Share Breakdown uses the top five performance groups. Its percentages are
relative to those visible groups, **not the entire sheet**. The builder donut
also uses this subset. Negative or mixed-sign measures may not be meaningful
as a share/donut chart; use bars or lines and inspect source values instead.

Default Top Segment, Momentum, and narrative insight cards are created when
the sheet is analyzed. They continue to describe the default primary metric
and default dimensions, even after builder choices change. The selected-total
KPI, builder charts, and Top Performers list follow builder selections.
Momentum compares the last two points of the bounded default series, not
necessarily the latest two dates in the complete dataset.

### What Automatic Cleaning Changes

Before reporting, `cleanRows`:

- Removes rows whose values are all null, undefined, or empty strings.
- Treats a column as numeric for cleaning when all populated values can be
  converted with JavaScript Number; missing numeric values are filled with
  that column's mean.
- Otherwise trims values into strings and fills missing cells with the most
  frequent populated value, or Unknown when no usable mode is selected.
- Removes exact duplicate rows after these transformations.

These operations change totals, record counts, distributions, and potentially
legitimate repeated transactions. There is no cleaning opt-out, original-versus-
cleaned comparison, imputation log, or undo. The preview is of **cleaned rows**,
not the untouched workbook.

Column detection is heuristic, not schema validation. The numeric parser
validates a whole numeric value, allowing decimals, grouped thousands,
scientific notation, common currency prefixes, accounting negatives, and a
percent suffix. Labels such as "Group 11" and ISO dates are not numeric values.
Digit-only identifiers can still look like measures; percent suffixes retain
their displayed numeric value rather than being normalized. Cleaning may
also stringify dates.
Currency-like column names (sales, revenue, cost, profit, etc.) are displayed
as USD regardless of the source currency. There is no currency conversion,
locale selection, percentage normalization, or spreadsheet formula
recalculation. Cached formula values may be used by the parser.

Use the app for exploratory reporting. Reconcile critical totals with the
source workbook; do not treat automated insights as audited calculations.

### Session Lifecycle

Reset Dashboard clears the file, workbook, selection, and status. Uploading a
replacement supersedes the existing report. Refresh/close clears all in-memory
data. While a workbook is loaded, a standard browser leave-page warning is
registered. Browsers control its wording and may suppress it; it is not a custom
dialog or a guarantee of recovery.

Moving into or out of EasyMadeConversions opens a confirmation dialog,
including browser Back/Forward. **Stay here**, Escape, or closing the dialog
cancels the switch and retains your session. **Switch workspace** proceeds:
the workbook is cleared when leaving Insights; selected files, edits, and
results are cleared when leaving Conversions. Download results first.
Report configuration is not saved. Hard reloads and cross-origin navigation
are not intercepted by this custom dialog.

The workspaces use routes on the same website, not separate subdomains.
Conversions hides Upload, Overview, Visual Builder, Preview, and Insights.
Use **Back to EasyMadeInsights** to return; on mobile the switch is also in
the top navbar.

## EasyMadeConversions

Visit `/conversions`, search by tool name/description, or filter All, File
Tools, Image Tools, or Developer Tools. Choose **Use Tool** to open a modal.
Escape closes it; Tab stays within it; closing returns focus to the opener.
Closing and reopening resets that tool's inputs and results.

Document tools offer **Expand original preview** and, after conversion,
**Expand converted preview**. The image studio offers **Expand image preview**.
Popups use the available screen space, with fit-to-window and 100% size options
for images/DOCX; full-size content scrolls instead of being cropped. PDF uses
the browser's viewer. Escape closes the topmost popup only and returns focus
to its opener. Downloading from a popup uses the same result file, not a
screenshot. DOCX previews preserve page proportions but remain approximate.

The website theme affects the controls, not the document paper. DOCX pages
default to white with their original text colors; an explicit document
background is preserved. Preview loading and errors are shown as readable
notices. On short screens the popup body scrolls to keep its controls and
document area accessible, rather than collapsing the document to zero height.

### PDF to Word

1. Select a nonempty `.pdf` up to 50 MiB (52,428,800 bytes).
2. Inspect the original PDF in the browser's PDF viewer.
3. Choose Auto text recovery, or OCR every page if text is missing. Start
   conversion and wait for success.
4. Download the resulting `.docx`.

The document is uploaded to the conversion server. Native text becomes real
Word paragraphs; detected native tables become editable cells. Full-page scan
screenshots do not replace text. English scans use the installed OCR language
model; missing data/unreadable scans produce errors rather than image-only DOCX.

Auto detects textless pages and large scans with sparse native text. For
embedded text missed on a partially readable PDF, choose OCR every page. This
also rasterizes native text for recognition, may introduce mistakes, and loses
native table/style fidelity. Recheck spelling, numbers, and reading order.
Columns, scan tables, fonts, and layout may differ. Photos/logos remain images.
Unlock password-protected PDFs first. Convert at most 100 pages per request;
complex OCR inputs may time out sooner.

### Word to PDF

1. Select a nonempty `.docx` or `.doc` up to 50 MiB.
2. Inspect the DOCX preview when available; legacy DOC has no browser preview.
3. Start conversion.
4. Download the resulting PDF after success.

DOCX preview is approximate and may fail independently of conversion.
Office/LibreOffice engines offer better layout fidelity. The simpler Python
fallback renders text and tables with wrapping/pagination, but may lose images,
fonts, headers, footers, and other styling. Legacy DOC requires a compatible
office engine; the text-and-table fallback only handles DOCX.

Both converters require a working backend. Replacing the file clears the
previous download and cancels the client request. The UI will not offer HTML
error pages as converted documents. Request timeout is two minutes; large or
complex inputs may fail before that. Closing the modal does not guarantee
server-side cancellation.

### Image Converter Studio

Drop one PNG, JPEG, WebP, or BMP, or use the file picker. Inputs are limited
to 25 MiB and 80 megapixels after decoding. The editor has Transform, Size,
Color & tone, and Export panels.

Crop image/Crop visually works on the original. Drag outside the selection to
draw a crop, inside to move, or use corner handles to resize. Choose Freeform,
1:1, 4:3, 16:9, or 3:4. Focus selection/handles and use arrow keys for pixel
changes, or Shift+arrows for ten-pixel changes. Visual cropping sets output
dimensions to the crop; numeric fields remain available.

Crop values must be whole pixels and stay inside the original image. Output
resize dimensions are at most 8,192 pixels per side and 32,000,000 pixels total.
The order is crop, resize, flip, then rotate; 90/270-degree rotation swaps
output dimensions. Keep aspect ratio is initially enabled; changing a resize
dimension adjusts the other to the crop ratio. Disable it for independent
dimensions. Crop size, 50%, and 1920-pixel-width presets provide quick sizing.
Oversized sources initially scale down to output safety limits.

Brightness, contrast, saturation, warmth, and Original/Mono/Warm/Cool/Vivid looks
are baked into export pixels. Horizontal/vertical flips are available.
Undo/Redo keeps up to 40 snapshots; one pointer crop gesture is one undo step.
Reset edits restores original geometry/neutral adjustments and keeps format.
Replacing the file clears history.

Export PNG, JPG, WebP, or ICO. PNG is lossless; JPG/WebP have quality controls.
Keep transparency or choose a solid background; JPG uses white when
transparency is selected. Adjustments do not tint the selected background.
ICO contains one aspect-fitted 64x64 PNG, not a multi-resolution icon pack.

Export preview shows the actual encoded blob: the downloaded PNG/JPG/WebP
bytes, or the PNG embedded in ICO. Fit scales the view; 100% shows native
pixels. Checkerboard indicates transparency and is not exported. Browser
rendering/export uses sRGB; external viewers, displays, wide-gamut input
profiles, and resampling can differ from the source. Crop mode shows the
original; return to Export preview for the finished result. Changing/invalid
settings disable download until a new valid output is ready. Processing stays
in the browser.

### File Comparison

Choose **Paste Text** or **Upload Files**, provide two inputs, and click
**Compare Now**. The result shows original line numbers and unchanged,
modified, added, or removed text; modified pairs include token highlights.
Changing input invalidates the result until you compare again.

Upload mode accepts UTF-8 `.txt`, `.csv`, `.json`, `.md`, and `.log`
files up to 200,000 bytes each. Paste mode allows 200,000 characters per input.
An empty side can represent a complete addition/deletion. Switching modes
clears both inputs. Whitespace is significant; CRLF/CR line endings are
normalized to LF.

Comparison is textual, not semantic JSON/CSV analysis and not binary PDF/Word
comparison. A line-count product above 2,000,000 is rejected to bound memory
usage. Large modified lines fall back to whole-line highlighting when the
token-count product exceeds 100,000. No file is sent to the server.

### JWT Decoder

Paste a three-part JWT, decode it, and inspect/copy the header or payload.
Base64URL and UTF-8 JSON are decoded locally; malformed input shows an error.
Editing the token clears the old result. Clipboard support/permissions depend
on the browser and secure context.

**Decoded does not mean trusted.** The tool does not verify signatures,
expiration, issuer, audience, or authorization. It is not a login validator,
an encrypted-token decoder, or a reason to share production credentials.
Prefer test tokens.

## Privacy and Troubleshooting

Workbooks, images, comparison text, and JWTs stay in browser processing in
their current flows. This does not eliminate normal hosting/network requests
for page assets. PDF/Word documents go to the configured server, which writes
temporary files and logs filenames/request information. Cleanup is best effort.
No formal retention guarantee or encrypted document store is implemented.

Workbook takeaways do not transmit workbook data or call an AI service. If
the experimental AI endpoint is used directly or wired up later, its summary is
sent to the external provider and may include preview rows.

For unreadable uploads, try a small table with unique headers and lowercase
extensions. For unavailable document conversion, check API connectivity and
Python/office prerequisites. A failed tool should not produce a download:
change the input or fix the reported problem first. See
[Development Troubleshooting](DEVELOPMENT.md#troubleshooting) and
[Deployment](DEPLOYMENT.md) for environment-specific checks.
