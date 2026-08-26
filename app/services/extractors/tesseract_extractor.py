"""
Nécessite : pip install pytesseract
Nécessite AUSSI le binaire Tesseract lui-même (pytesseract n'est qu'un wrapper Python) :
téléchargé et installé séparément depuis https://github.com/UB-Mannheim/tesseract/wiki
Pense à cocher le pack de langue "French" pendant l'installation, sinon lang="fra" échouera.
"""
import os
import time
from .base import BaseExtractor, ExtractionResult
from .pdf_utils import pdf_to_images
from .field_parser import parse_fields_from_text

DEFAULT_WINDOWS_PATH = r"C:\Program Files\Tesseract-OCR\tesseract.exe"


class TesseractExtractor(BaseExtractor):
    name = "tesseract"

    def __init__(self, lang: str = "fra", tesseract_cmd: str = None):
        import pytesseract
        cmd = tesseract_cmd or os.environ.get("TESSERACT_CMD") or DEFAULT_WINDOWS_PATH
        if os.path.exists(cmd):
            pytesseract.pytesseract.tesseract_cmd = cmd
        # Si le chemin n'existe pas, on laisse pytesseract chercher dans le PATH système —
        # l'erreur explicite viendra au premier appel plutot que maintenant.
        self.pytesseract = pytesseract
        self.lang = lang

    def extract(self, pdf_path: str) -> ExtractionResult:
        start = time.time()
        try:
            images = pdf_to_images(pdf_path)
            all_text = []
            for img in images:
                text = self.pytesseract.image_to_string(img, lang=self.lang)
                all_text.append(text)
            full_text = "\n".join(all_text)

            fields = parse_fields_from_text(full_text)
            elapsed = time.time() - start
            return ExtractionResult(
                **fields,
                raw_response=full_text,
                elapsed_seconds=elapsed,
                cost_estimate_eur=0.0,
            )
        except Exception as e:
            return ExtractionResult(error=f"{type(e).__name__}: {e}", elapsed_seconds=time.time() - start)
