"""
base.py — Contrats d'interface du ToolRegistry.

Ce module definit :
- Les dataclasses de metadonnees et de reponse communes a tous les providers.
- Les trois classes abstraites (une par modalite) que chaque adaptateur
  provider (OpenAI, Anthropic, ...) doit implementer.

Aucun appel reseau, aucune logique provider-specifique ne doit vivre ici.
Ce fichier ne connait ni OpenAI ni Anthropic : c'est le contrat neutre
que les deux respectent.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional


# Exceptions communes

class ToolRegistryError(Exception):
    """Exception de base pour toute erreur emise par le ToolRegistry."""


class ProviderCallError(ToolRegistryError):
    """
    Leve quand l'appel a un provider echoue (erreur reseau, timeout,
    reponse malformee, quota depasse, etc.).

    Les adaptateurs concrets doivent capturer les exceptions specifiques
    a leur SDK (openai.APIError, anthropic.APIError, ...) et les
    re-lever sous cette forme, pour que le code metier n'ait jamais
    a connaitre les exceptions propres a chaque SDK.
    """

    def __init__(self, provider: str, message: str, original_exception: Optional[Exception] = None):
        self.provider = provider
        self.original_exception = original_exception
        super().__init__(f"[{provider}] {message}")


# Metadonnees communes (necessaires au benchmark Phase 1 : latence, cout)

@dataclass(frozen=True)
class CallMetadata:
    """
    Metadonnees d'observabilite attachees a CHAQUE appel, quelle que soit
    la modalite. Ces champs existent parce que le cahier des charges impose
    de mesurer latence (p50/p95) et cout par appel pour le benchmark
    (section 3.2.2) : en les rendant obligatoires ici, aucun adaptateur ne
    peut "oublier" de les renseigner.

    Attributes:
        provider: nom du provider ayant traite l'appel (ex: "openai", "anthropic").
        model_name: identifiant exact du modele utilise (ex: "gpt-4o-mini").
        latency_ms: duree totale de l'appel en millisecondes.
        tokens_input: nombre de tokens en entree (0 si non applicable, ex: audio).
        tokens_output: nombre de tokens en sortie.
        estimated_cost_eur: cout estime de l'appel, calcule a partir des tokens
            et de la grille tarifaire du provider (rempli par l'adaptateur).
    """
    provider: str
    model_name: str
    latency_ms: float
    tokens_input: int = 0
    tokens_output: int = 0
    estimated_cost_eur: float = 0.0


# Modalite 1 : Texte -> Devis

@dataclass(frozen=True)
class TextGenerationResponse:
    """Reponse d'un modele texte, avant tout parsing JSON metier."""
    content: str
    metadata: CallMetadata


class BaseTextModel(ABC):
    """
    Interface pour tout modele capable de transformer une description
    texte libre en contenu structure (devis).

    Toute classe qui herite de BaseTextModel DOIT implementer generate().
    Sans cela, Python refuse l'instanciation (TypeError a la creation de
    l'objet, pas au premier appel en production).
    """

    @abstractmethod
    def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        max_tokens: int = 1000,
        temperature: float = 0.2,
    ) -> TextGenerationResponse:
        """
        Genere une reponse texte a partir d'un prompt utilisateur.

        Args:
            prompt: description libre fournie par le commercial/technicien.
            system_prompt: instructions systeme (ex: catalogue en cache, few-shot).
            max_tokens: limite de tokens en sortie (le cahier des charges
                recommande 800-1000 pour les reponses structurees, section 4.3).
            temperature: creativite du modele. Basse par defaut car on veut
                des devis reproductibles, pas creatifs.

        Returns:
            TextGenerationResponse contenant le texte brut et les metadonnees
            d'appel (latence, tokens, cout).

        Raises:
            ProviderCallError: si l'appel au provider echoue.
        """
        raise NotImplementedError


# Modalite 2 : Photo -> Analyse

@dataclass(frozen=True)
class VisionAnalysisResponse:
    """Reponse d'un modele de vision, avant tout parsing JSON metier."""
    content: str
    metadata: CallMetadata


class BaseVisionModel(ABC):
    """
    Interface pour tout modele capable d'analyser une photo de chantier
    (identification de piece, estimation de surface, materiaux visibles).
    """

    @abstractmethod
    def analyze_image(
        self,
        image_bytes: bytes,
        prompt: str,
        system_prompt: Optional[str] = None,
        max_tokens: int = 1000,
    ) -> VisionAnalysisResponse:
        """
        Analyse une image et retourne une description/structuration texte.

        Args:
            image_bytes: contenu binaire brut de l'image (jpg/png).
            prompt: instruction d'analyse (ex: "identifie la piece, estime
                la surface, liste les materiaux visibles").
            system_prompt: instructions systeme optionnelles.
            max_tokens: limite de tokens en sortie.

        Returns:
            VisionAnalysisResponse contenant le texte d'analyse et les
            metadonnees d'appel.

        Raises:
            ProviderCallError: si l'appel au provider echoue.
        """
        raise NotImplementedError


# Modalite 3 : Audio -> Texte

@dataclass(frozen=True)
class TranscriptionResponse:
    """Reponse d'un modele de transcription."""
    text: str
    metadata: CallMetadata
    confidence: Optional[float] = None
    detected_language: Optional[str] = None


class BaseTranscriptionModel(ABC):
    """
    Interface pour tout modele de transcription vocale (Whisper API,
    Whisper auto-heberge, ...).
    """

    @abstractmethod
    def transcribe(
        self,
        audio_bytes: bytes,
        language_hint: Optional[str] = "fr",
    ) -> TranscriptionResponse:
        """
        Transcrit un enregistrement audio en texte.

        Args:
            audio_bytes: contenu binaire brut du fichier audio.
            language_hint: indice de langue pour ameliorer la precision
                (le cahier des charges cible le FR technique, section 4.3).

        Returns:
            TranscriptionResponse contenant le texte transcrit, un score
            de confiance si disponible, et les metadonnees d'appel.

        Raises:
            ProviderCallError: si l'appel au provider echoue.
        """
        raise NotImplementedError