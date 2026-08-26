"""
Nécessite : pip install groq pytesseract
Nécessite : export GROQ_API_KEY=... (clé gratuite depuis console.groq.com)

Architecture Hybride, en 2 étapes explicitement chronométrées séparément :
1. OCR pur (Tesseract) -> texte brut
2. LLM texte (Groq/Llama) -> structure ce texte en JSON

Groq ne reçoit JAMAIS l'image/le PDF, seulement le texte produit par l'étape 1.
"""
import json
import time

from .base import BaseExtractor, ExtractionResult
from .tesseract_extractor import TesseractExtractor
from .gemini_extractor import PROMPT as VISION_PROMPT

TEXT_PROMPT = VISION_PROMPT.replace(
    "Analyse cette facture et réponds",
    "Voici le texte brut extrait par OCR d'une facture (peut contenir des erreurs de "
    "reconnaissance). Analyse-le et réponds",
)


class HybridTesseractGroqExtractor(BaseExtractor):
    name = "hybrid_tesseract_groq"

    def __init__(self, model_name: str = "llama-3.3-70b-versatile"):
        from groq import Groq
        import os
        self.client = Groq(api_key=os.environ["GROQ_API_KEY"])
        self.model_name = model_name
        self._ocr = TesseractExtractor()  # reutilise l'OCR Tesseract

    def extract(self, pdf_path: str) -> ExtractionResult:
        total_start = time.time()
        try:
            # --- ETAPE 1 : OCR pur (Tesseract) --- chronometree separement de l'etape 2
            ocr_start = time.time()
            ocr_result = self._ocr.extract(pdf_path)
            ocr_elapsed = time.time() - ocr_start

            if ocr_result.error:
                return ExtractionResult(
                    error=f"Echec OCR en amont (etape 1/2): {ocr_result.error}",
                    elapsed_seconds=time.time() - total_start,
                )
            raw_text = ocr_result.raw_response

            # --- ETAPE 2 : LLM texte (Groq) --- chronometree separement de l'etape 1
            llm_start = time.time()
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {"role": "user", "content": f"{TEXT_PROMPT}\n\nTexte brut extrait par OCR:\n{raw_text}"}
                ],
                response_format={"type": "json_object"},
            )
            llm_elapsed = time.time() - llm_start
            total_elapsed = time.time() - total_start

            text = response.choices[0].message.content.strip()
            data = json.loads(text)

            usage = response.usage
            in_tok = getattr(usage, "prompt_tokens", 0) if usage else 0
            out_tok = getattr(usage, "completion_tokens", 0) if usage else 0

            breakdown = f"[Etape 1 - OCR Tesseract: {ocr_elapsed:.2f}s | Etape 2 - LLM Groq: {llm_elapsed:.2f}s | Total: {total_elapsed:.2f}s]"

            return ExtractionResult(
                date_facture=data.get("date_facture"),
                numero_facture=data.get("numero_facture"),
                nom_fournisseur=data.get("nom_fournisseur"),
                montant_ht=data.get("montant_ht"),
                montant_tva=data.get("montant_tva"),
                montant_ttc=data.get("montant_ttc"),
                produits=data.get("produits") or [],
                raw_response=f"{breakdown}\n{text}",
                elapsed_seconds=total_elapsed,
                ocr_elapsed_seconds=ocr_elapsed,
                llm_elapsed_seconds=llm_elapsed,
                input_tokens=in_tok,
                output_tokens=out_tok,
                cost_estimate_eur=0.0,
            )
        except Exception as e:
            return ExtractionResult(error=f"{type(e).__name__}: {e}", elapsed_seconds=time.time() - total_start)
