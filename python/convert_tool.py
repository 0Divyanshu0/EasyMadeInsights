import os
import shutil
import subprocess
import sys
import io
from xml.sax.saxutils import escape


def _bbox_intersects(a, b) -> bool:
    return not (a[2] <= b[0] or b[2] <= a[0] or a[3] <= b[1] or b[3] <= a[1])


def _ocr_data_directory():
    from pathlib import Path
    candidates = [
        os.environ.get("TESSDATA_PREFIX"),
        str(Path(__file__).resolve().parent.parent / ".ocr" / "tessdata"),
        "/usr/share/tesseract-ocr/5/tessdata",
        "/usr/share/tesseract-ocr/4.00/tessdata",
        r"C:\Program Files\Tesseract-OCR\tessdata",
    ]
    for candidate in candidates:
        if candidate and (Path(candidate) / "eng.traineddata").is_file():
            return candidate
    raise RuntimeError(
        "This PDF needs OCR to produce editable text. English OCR data is not installed. "
        "Run python python/setup_ocr.py on the conversion server, then retry."
    )


def _extract_pdf_pages_structure(input_path: str, ocr_mode="auto"):
    import fitz
    import pdfplumber

    pages = []
    with fitz.open(input_path) as pdf, pdfplumber.open(input_path) as tables_pdf:
        if pdf.needs_pass:
            raise RuntimeError("Password-protected PDFs must be unlocked before conversion.")
        if len(pdf) > 100:
            raise RuntimeError("Convert at most 100 PDF pages at a time.")
        for page_index, page in enumerate(pdf):
            native = page.get_text("dict", sort=True)
            native_text = page.get_text("text").strip()
            images = [block for block in native["blocks"] if block["type"] == 1]
            area = max(1, page.rect.width * page.rect.height)
            scan_background = any(
                fitz.Rect(block["bbox"]).get_area() / area >= 0.6 for block in images
            )
            # A sparse text layer over a page scan must not mask its unreadable body.
            needs_ocr = ocr_mode == "force" or not native_text or (scan_background and len(native_text) < 200)
            if needs_ocr:
                if not images and not page.get_drawings() and not native_text:
                    pages.append({"elements": [], "ocr": False})
                    continue
                dpi = min(200, int(72 * (16000000 / area) ** 0.5))
                if dpi < 72:
                    raise RuntimeError("This page is too large for OCR. Use a smaller page size.")
                try:
                    textpage = page.get_textpage_ocr(
                        language="eng", dpi=dpi, full=True, tessdata=_ocr_data_directory()
                    )
                    native = page.get_text("dict", textpage=textpage, sort=True)
                except RuntimeError as error:
                    if "OCR data is not installed" in str(error):
                        raise
                    raise RuntimeError(
                        f"OCR failed on page {page_index + 1}. Check the OCR data and scan quality."
                    ) from error

            elements = []
            table_boxes = []
            if not needs_ocr:
                try:
                    tables = tables_pdf.pages[page_index].find_tables()
                except Exception:
                    tables = []
                for table in tables:
                    rows = table.extract() or []
                    if rows and any(any(str(cell or "").strip() for cell in row) for row in rows):
                        table_boxes.append(table.bbox)
                        elements.append({"type": "table", "bbox": table.bbox, "content": rows})

            for block in native["blocks"]:
                if block["type"] != 0:
                    continue
                lines = []
                for line in block["lines"]:
                    if any(_bbox_intersects(line["bbox"], bbox) for bbox in table_boxes):
                        continue
                    spans = [span for span in line["spans"] if span["text"].strip()]
                    if spans:
                        lines.append(spans)
                if not lines:
                    continue
                text = " ".join("".join(span["text"] for span in line) for line in lines).strip()
                if not text:
                    continue
                maximum_size = max(span["size"] for line in lines for span in line)
                elements.append({
                    "type": "text", "bbox": block["bbox"], "lines": lines,
                    "heading": (1 if maximum_size >= 18 else 2) if maximum_size >= 15 and len(text) < 160 else None,
                })

            # Keep actual illustrations, never a full-page scan standing in for its text.
            if not needs_ocr:
                for block in images:
                    if fitz.Rect(block["bbox"]).get_area() / area < 0.6:
                        elements.append({"type": "image", "bbox": block["bbox"], "image_bytes": block["image"]})
            elements.sort(key=lambda element: (round(element["bbox"][1], 1), element["bbox"][0]))
            has_text = any(element["type"] in ("text", "table") for element in elements)
            if needs_ocr and not has_text:
                raise RuntimeError(
                    f"No readable text was found on scanned page {page_index + 1}. "
                    "Try a clearer scan; photographs cannot become editable text."
                )
            pages.append({"elements": elements, "ocr": needs_ocr})
    return pages


def _add_docx_table(document, rows):
    max_columns = max(len(row) for row in rows)
    table = document.add_table(rows=len(rows), cols=max_columns)
    table.style = "Table Grid"
    for row_index, row in enumerate(rows):
        for column_index in range(max_columns):
            value = row[column_index] if column_index < len(row) else ""
            cell = table.rows[row_index].cells[column_index]
            cell.text = "" if value is None else str(value)
            if row_index == 0:
                for paragraph in cell.paragraphs:
                    for run in paragraph.runs:
                        run.bold = True


def _add_docx_image(document, image_bytes, bbox):
    from docx.shared import Inches
    try:
        document.add_picture(io.BytesIO(image_bytes), width=Inches(min(6.5, max(0.25, (bbox[2] - bbox[0]) / 72))))
    except Exception:
        pass


def _add_editable_text(document, element, ocr):
    from docx.shared import Pt, RGBColor
    paragraph = document.add_paragraph(style=f"Heading {element['heading']}" if element["heading"] else None)
    for line_index, line in enumerate(element["lines"]):
        if line_index:
            paragraph.add_run(" ")
        for span in line:
            run = paragraph.add_run(span["text"])
            if not ocr:
                run.font.size = Pt(min(48, max(6, span["size"])))
                run.bold = bool(span.get("flags", 0) & 16)
                run.italic = bool(span.get("flags", 0) & 2)
                run.font.color.rgb = RGBColor.from_string(f"{span.get('color', 0):06X}"[-6:])


def _has_editable_docx_content(output_path):
    from docx import Document
    document = Document(output_path)
    return any(paragraph.text.strip() for paragraph in document.paragraphs) or any(
        cell.text.strip() for table in document.tables for row in table.rows for cell in row.cells
    )


def convert_pdf_to_word(input_path: str, output_path: str, ocr_mode="auto") -> None:
    from docx import Document

    pages = _extract_pdf_pages_structure(input_path, ocr_mode)
    if not any(element["type"] in ("text", "table") for page in pages for element in page["elements"]):
        raise RuntimeError("No editable text could be extracted from this PDF.")
    document = Document()
    for page_index, page in enumerate(pages):
        if page_index:
            document.add_page_break()
        for element in page["elements"]:
            if element["type"] == "table":
                _add_docx_table(document, element["content"])
            elif element["type"] == "image":
                _add_docx_image(document, element["image_bytes"], element["bbox"])
            else:
                _add_editable_text(document, element, page["ocr"])
    document.save(output_path)
    if not _has_editable_docx_content(output_path):
        raise RuntimeError("Conversion produced no editable text. Image-only Word output was rejected.")


def convert_word_to_pdf(input_path: str, output_path: str) -> None:
    # 1) Best on Windows (uses installed MS Word)
    try:
        from docx2pdf import convert as docx2pdf_convert

        docx2pdf_convert(input_path, output_path)
        if os.path.exists(output_path):
            return
    except Exception:
        pass

    # 2) Fallback: LibreOffice headless
    soffice = shutil.which("soffice")
    if soffice:
        out_dir = os.path.dirname(output_path)
        base_name = os.path.splitext(os.path.basename(input_path))[0]

        cmd = [
            soffice,
            "--headless",
            "--convert-to",
            "pdf",
            "--outdir",
            out_dir,
            input_path,
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)

        generated = os.path.join(out_dir, f"{base_name}.pdf")
        if result.returncode == 0 and os.path.exists(generated):
            if os.path.abspath(generated) != os.path.abspath(output_path):
                os.replace(generated, output_path)
            return

    # Simplified fallback preserves text and tables, with wrapping and pagination.
    try:
        from docx import Document
        from reportlab.lib.pagesizes import letter
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.lib import colors
        from docx.text.paragraph import Paragraph as WordParagraph
        from docx.table import Table as WordTable

        doc = Document(input_path)
        styles = getSampleStyleSheet()
        story = []
        for element in doc.element.body:
            if element.tag.endswith("}p"):
                paragraph = WordParagraph(element, doc)
                if paragraph.text.strip():
                    name = paragraph.style.name
                    style = styles["Heading1"] if name.startswith("Heading") else styles["BodyText"]
                    story.append(Paragraph(escape(paragraph.text).replace("\n", "<br/>"), style))
                story.append(Spacer(1, 8))
            elif element.tag.endswith("}tbl"):
                table = WordTable(element, doc)
                cells = [[Paragraph(escape(cell.text).replace("\n", "<br/>"), styles["BodyText"])
                          for cell in row.cells] for row in table.rows]
                if cells:
                    rendered = Table(cells, colWidths=[468 / len(cells[0])] * len(cells[0]), repeatRows=1)
                    rendered.setStyle(TableStyle([
                        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                        ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ]))
                    story.extend([rendered, Spacer(1, 12)])
        if not any(isinstance(item, (Paragraph, Table)) for item in story):
            raise RuntimeError("No text or tables could be extracted from this document.")
        SimpleDocTemplate(output_path, pagesize=letter).build(story)
        return
    except Exception:
        pass

    raise RuntimeError(
        "Unable to convert Word to PDF. Install Microsoft Word (for docx2pdf), "
        "LibreOffice (soffice headless), or ensure python-docx and reportlab are installed."
    )


def main() -> int:
    if len(sys.argv) not in (4, 5):
        print("Usage: python convert_tool.py <pdf-to-word|word-to-pdf> <input> <output> [auto|force]", file=sys.stderr)
        return 2

    mode, input_path, output_path = sys.argv[1], sys.argv[2], sys.argv[3]
    ocr_mode = sys.argv[4] if len(sys.argv) == 5 else "auto"
    if ocr_mode not in ("auto", "force"):
        print("OCR mode must be auto or force.", file=sys.stderr)
        return 2

    if not os.path.exists(input_path):
        print(f"Input file not found: {input_path}", file=sys.stderr)
        return 2

    try:
        if mode == "pdf-to-word":
            convert_pdf_to_word(input_path, output_path, ocr_mode)
        elif mode == "word-to-pdf":
            convert_word_to_pdf(input_path, output_path)
        else:
            print(f"Unsupported mode: {mode}", file=sys.stderr)
            return 2

        return 0
    except Exception as exc:
        print(str(exc), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
