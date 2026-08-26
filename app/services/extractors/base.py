"""Interface commune à toutes les technologies testées."""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any


@dataclass
class ExtractionResult:
    date_facture: Optional[str] = None
    numero_facture: Optional[str] = None
    nom_fournisseur: Optional[str] = None
    montant_ht: Optional[float] = None
    montant_tva: Optional[float] = None
    montant_ttc: Optional[float] = None
    produits: List[str] = field(default_factory=list)

    raw_response: str = ""          # utile pour debug / rejouer le scoring plus tard
    elapsed_seconds: float = 0.0
    ocr_elapsed_seconds: float = 0.0   # pour les pipelines hybrides : temps OCR seul
    llm_elapsed_seconds: float = 0.0   # pour les pipelines hybrides : temps LLM seul
    input_tokens: int = 0
    output_tokens: int = 0
    cost_estimate_eur: float = 0.0  # 0.0 pour PaddleOCR/EasyOCR/Gemini free tier
    error: Optional[str] = None     # rempli si l'appel a échoué (timeout, quota, PDF illisible...)
    confidence_scores: Dict[str, float] = field(default_factory=dict)  # score de confiance par champ (0.0-1.0)


@dataclass
class PlanExtractionResult:
    pieces: List[Dict[str, Any]] = field(default_factory=list)  # [{"nom": str, "cotes": List[str], "surface_m2": Optional[float]}]
    surface_totale_m2: Optional[float] = None

    raw_response: str = ""
    elapsed_seconds: float = 0.0
    input_tokens: int = 0
    output_tokens: int = 0
    cost_estimate_eur: float = 0.0
    error: Optional[str] = None
    confidence_scores: Dict[str, float] = field(default_factory=dict)  # score de confiance par champ (0.0-1.0)


class BaseExtractor(ABC):
    """Chaque technologie (Gemini, GPT-4o, Claude, PaddleOCR, EasyOCR, Qwen-VL...)
    implémente cette interface. Le harness ne connaît que .name et .extract()."""

    name: str = "base"

    @abstractmethod
    def extract(self, pdf_path: str) -> ExtractionResult:
        """Doit toujours retourner un ExtractionResult, jamais lever d'exception —
        en cas d'erreur, la capturer et la mettre dans .error pour que le benchmark
        continue sur le document suivant plutôt que de tout arrêter."""
        raise NotImplementedError
