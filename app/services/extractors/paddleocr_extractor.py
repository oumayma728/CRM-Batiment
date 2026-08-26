"""Nécessite : pip install paddlepaddle paddleocr"""
import time
from .base import BaseExtractor, ExtractionResult
from .pdf_utils import pdf_to_images
from .field_parser import parse_fields_from_text


class PaddleOCRExtractor(BaseExtractor):
    name = "paddleocr"

    def __init__(self, lang: str = "fr"):
        from paddleocr import PaddleOCR
        self.ocr = PaddleOCR(use_angle_cls=True, lang=lang, enable_mkldnn=False)  # show_log retiré, n'existe plus en 3.x

    def extract(self, pdf_path: str) -> ExtractionResult:
        start = time.time()
        try:
            images = pdf_to_images(pdf_path)
            all_text = []
            for img in images:
                result = self.ocr.predict(img)  # predict() = méthode actuelle (.ocr() n'est qu'un alias)
                for res in result:
                    # PaddleOCR 3.x renvoie des objets avec 'rec_texts' ; on garde un filet de
                    # sécurité sur l'ancien format au cas où ta version se comporte différemment.
                    if hasattr(res, "get") and res.get("rec_texts"):
                        all_text.extend(res["rec_texts"])
                    elif isinstance(res, (list, tuple)):
                        for line in res:
                            all_text.append(line[1][0])
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