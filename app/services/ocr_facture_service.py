"""
Service OCR Factures — factory d'extracteurs.

Délègue au registre centralisé `extractor_registry.get_extractor()`.
Conservé comme couche d'adaptation API (convertit ValueError → HTTPException).
"""
from fastapi import HTTPException

from app.services.extractors.base import BaseExtractor
from app.services.extractor_registry import get_extractor as _registry_get_extractor


def get_extractor(technology: str) -> BaseExtractor:
    """Retourne l'extracteur facture correspondant à la technologie demandée.

    Raises:
        HTTPException(400): si la technologie est inconnue.
    """
    try:
        return _registry_get_extractor(technology, doc_type="invoice")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
