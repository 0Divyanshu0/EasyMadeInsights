"""Install a verified, project-local English OCR model. No document upload."""
from pathlib import Path
import hashlib
import urllib.request


REVISION = "87416418657359cb625c412a48b6e1d6d41c29bd"
EXPECTED_HASH = "7d4322bd2a7749724879683fc3912cb542f19906c83bcc1a52132556427170b2"
MODEL_URL = f"https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/{REVISION}/eng.traineddata"


def main():
    target = Path(__file__).resolve().parent.parent / ".ocr" / "tessdata" / "eng.traineddata"
    if target.exists() and hashlib.sha256(target.read_bytes()).hexdigest() == EXPECTED_HASH:
        print("English OCR model is already installed.")
        return
    with urllib.request.urlopen(MODEL_URL, timeout=60) as response:
        data = response.read(5000000)
    if hashlib.sha256(data).hexdigest() != EXPECTED_HASH:
        raise RuntimeError("OCR model checksum mismatch. Nothing was installed.")
    target.parent.mkdir(parents=True, exist_ok=True)
    temporary = target.with_suffix(".tmp")
    temporary.write_bytes(data)
    temporary.replace(target)
    print("Verified English OCR model installed in .ocr/tessdata.")


if __name__ == "__main__":
    main()
