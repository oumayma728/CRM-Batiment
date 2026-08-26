"""Nécessite : pip install easyocr"""
import time
from .base import BaseExtractor, ExtractionResult
from .pdf_utils import pdf_to_images
from .field_parser import parse_fields_from_text


class EasyOCRExtractor(BaseExtractor):
    name = "easyocr"

    def __init__(self, langs=("fr",), gpu: bool = False):
        import easyocr
        self.reader = easyocr.Reader(list(langs), gpu=gpu)

    def extract(self, pdf_path: str) -> ExtractionResult:
        start = time.time()
        try:
            images = pdf_to_images(pdf_path)
            all_text = []
            for img in images:
                results = self.reader.readtext(img, detail=0)  # detail=0 -> juste le texte
                all_text.extend(results)
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
