"""
Classes abstraites définissant l'interface unifiée multi-provider.

Exigence CDC : "Implémenter des classes abstraites pour les trois modalités
(texte, vision, transcription)... Valider que l'interface expose les mêmes
méthodes pour tous les providers."

Chaque provider (OpenAI, Anthropic, Google, ...) implémente le sous-ensemble
de ces interfaces qu'il supporte réellement :
- OpenAI      : BaseTextModel + BaseVisionModel + BaseTranscriptionModel
- Anthropic   : BaseTextModel + BaseVisionModel (pas de transcription native)
- Google      : BaseTextModel + BaseVisionModel
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class DevisGenerationResult:
    """Résultat structuré retourné par generate_devis_from_text()."""
    raw_json: dict
    provider: str
    model: str
    latence_ms: float
    tokens_input: Optional[int] = None
    tokens_output: Optional[int] = None
    cout_estime_usd: Optional[float] = None


@dataclass
class PhotoAnalysisResult:
    """Résultat structuré retourné par analyze_photo()."""
    type_piece: Optional[str]
    surface_estimee_m2: Optional[float]
    materiaux_identifies: list = field(default_factory=list)
    reference_visible: Optional[bool] = None
    raw_json: dict = field(default_factory=dict)
    provider: str = ""
    model: str = ""
    latence_ms: float = 0.0
    tokens_input: Optional[int] = None
    tokens_output: Optional[int] = None
    cout_estime_usd: Optional[float] = None


@dataclass
class TranscriptionResult:
    """Résultat structuré retourné par transcribe_audio()."""
    transcription_texte: str
    confidence_score: Optional[float]
    duration_seconds: Optional[float]
    provider: str
    model: str
    latence_ms: float
    cout_estime_usd: Optional[float] = None


class BaseTextModel(ABC):
    """Interface unifiée pour la génération de devis à partir de texte."""

    @abstractmethod
    def generate_devis_from_text(
        self,
        description: str,
        system_prompt: Optional[str] = None,
        max_tokens: int = 1000,
    ) -> DevisGenerationResult:
        """
        Génère une proposition de devis structurée (JSON) à partir d'une
        description libre (saisie directe ou texte transcrit depuis un vocal).

        Args:
            description: Description libre du besoin.
            system_prompt: Prompt système (few-shot BTP + contexte catalogue,
                            pour bénéficier du prompt caching côté provider).
            max_tokens: Limite de tokens de sortie (800-1000 recommandé par le CDC).

        Returns:
            DevisGenerationResult contenant le JSON généré et les métadonnées d'appel.

        Raises:
            ProviderTimeoutError, ProviderAPIError
        """
        raise NotImplementedError


class BaseVisionModel(ABC):
    """Interface unifiée pour l'analyse de photos de chantier."""

    @abstractmethod
    def analyze_photo(
        self,
        image_base64: str,
        prompt: Optional[str] = None,
    ) -> PhotoAnalysisResult:
        """
        Analyse une photo de chantier : type de pièce, surface estimée, matériaux visibles.

        Args:
            image_base64: Image encodée en base64.
            prompt: Prompt structuré demandant type_pièce, surface_estimée_m2,
                    matériaux_identifiés, reference_visible_oui_non.

        Returns:
            PhotoAnalysisResult structuré.

        Raises:
            ProviderTimeoutError, ProviderAPIError
        """
        raise NotImplementedError


class BaseTranscriptionModel(ABC):
    """Interface unifiée pour la transcription audio.
    Seuls certains providers (ex: OpenAI/Whisper) l'implémentent réellement —
    voir UnsupportedModalityError pour les autres."""

    @abstractmethod
    def transcribe_audio(
        self,
        audio_bytes: bytes,
        audio_format: str = "wav",
    ) -> TranscriptionResult:
        """
        Transcrit un enregistrement audio en texte.

        Args:
            audio_bytes: Contenu binaire du fichier audio.
            audio_format: Format du fichier ("wav", "mp3", ...).

        Returns:
            TranscriptionResult structuré.

        Raises:
            ProviderTimeoutError, ProviderAPIError
        """
        raise NotImplementedError
