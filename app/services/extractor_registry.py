"""
Registre centralisé d'extracteurs — point d'entrée unique pour instancier un extracteur.

Utilisé par :
- Les routes API (ocr_facture_routes, plan_routes)
- Le benchmark autonome (run_benchmark.py)

Chaque branche fait un import lazy pour ne charger que la techno demandée
(EasyOCR + PyTorch pèsent ~500 Mo en RAM, inutile de tout précharger).
"""
from app.services.extractors.base import BaseExtractor


def get_extractor(technology: str, doc_type: str = "invoice") -> BaseExtractor:
    """Retourne l'extracteur correspondant à la technologie et au type de document.

    Args:
        technology: Nom de la techno (gemini, mistral, easyocr, tesseract, groq, etc.)
        doc_type: "invoice" pour les factures, "plan" pour les plans d'architecture.

    Returns:
        Instance de BaseExtractor prête à appeler .extract() ou .extract_plan().

    Raises:
        ValueError: si la technologie est inconnue ou non supportée pour ce type de document.
    """
    if doc_type == "plan":
        return _get_plan_extractor(technology)
    return _get_invoice_extractor(technology)


def _get_plan_extractor(technology: str) -> BaseExtractor:
    """Factory pour les extracteurs de plans d'architecture."""
    if technology == "gemini":
        from app.services.extractors.gemini_plan_extractor import GeminiPlanExtractor
        return GeminiPlanExtractor()

    if technology == "mistral":
        from app.services.extractors.mistral_plan_extractor import MistralPlanExtractor
        return MistralPlanExtractor()

    raise ValueError(
        f"Technologie d'extraction de plan non supportée : '{technology}'. "
        f"Technologies supportées pour les plans : gemini, mistral."
    )


def _get_invoice_extractor(technology: str) -> BaseExtractor:
    """Factory pour les extracteurs de factures."""
    if technology == "gemini":
        from app.services.extractors.gemini_extractor import GeminiExtractor
        return GeminiExtractor()

    if technology == "easyocr":
        from app.services.extractors.easyocr_extractor import EasyOCRExtractor
        return EasyOCRExtractor()

    if technology == "paddleocr":
        from app.services.extractors.paddleocr_extractor import PaddleOCRExtractor
        return PaddleOCRExtractor()

    if technology in ("gpt-4o", "openai"):
        from app.services.extractors.openai_extractor import OpenAIExtractor
        return OpenAIExtractor()

    if technology in ("claude", "anthropic"):
        from app.services.extractors.claude_extractor import ClaudeExtractor
        return ClaudeExtractor()

    if technology == "tesseract":
        from app.services.extractors.tesseract_extractor import TesseractExtractor
        return TesseractExtractor()

    if technology == "mistral":
        from app.services.extractors.mistral_extractor import MistralExtractor
        return MistralExtractor()

    if technology in ("groq", "easyocr+groq"):
        from app.services.extractors.hybrid_groq_extractor import HybridGroqExtractor
        return HybridGroqExtractor()

    if technology == "tesseract+groq":
        from app.services.extractors.hybrid_tesseract_groq_extractor import HybridTesseractGroqExtractor
        return HybridTesseractGroqExtractor()

    raise ValueError(
        f"Technologie OCR inconnue : '{technology}'. "
        f"Technologies supportées : gemini, easyocr, tesseract, mistral, "
        f"groq, easyocr+groq, tesseract+groq, gpt-4o, claude."
    )
