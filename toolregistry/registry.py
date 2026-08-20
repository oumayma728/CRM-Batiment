"""
registry.py — Orchestrateur ToolRegistry : point d'entree unifie qui lit
la configuration (config.py) et applique la strategie de fallback en
appelant les adaptateurs concrets, dans l'ordre principal -> fallbacks.

Couvre les 3 modalites :
- generate_devis_from_text(description)
- analyze_photo(image_bytes)
- transcribe_audio(audio_bytes)
"""

from __future__ import annotations

import json
import re
import time
from dataclasses import dataclass, field
from typing import Optional

from toolregistry.config import Modality, ModelChoice, get_config
from toolregistry.base import ProviderCallError

from toolregistry.openai_adapter import OpenAITextModel, OpenAIVisionModel, OpenAITranscriptionModel
from toolregistry.anthropic_adapter import AnthropicTextModel, AnthropicVisionModel
from toolregistry.mistral_adapter import MistralTextModel, MistralVisionModel, MistralVoxtralTranscriptionModel
from toolregistry.gemini_adapter import GeminiTextModel, GeminiVisionModel, GeminiTranscriptionModel
from toolregistry.whisper_local_adapter import WhisperLocalTranscriptionModel


SYSTEM_PROMPT_TEXTE = """Tu es un expert en devis BTP (batiment et travaux publics).
A partir de la description fournie par un client, genere une proposition de
devis structuree. Reponds UNIQUEMENT en JSON, sans texte autour, avec
exactement ce schema :
{
  "prestations": ["...", "..."],
  "materiaux": [
    {"nom": "...", "quantite": ..., "unite": "..."},
    ...
  ],
  "estimation_prix_total_eur": "..."
}
Le champ "estimation_prix_total_eur" peut etre une fourchette textuelle
(ex: "800-1200") si un prix exact n'est pas determinable.
Si une information ne peut pas etre determinee avec confiance, indique-le
explicitement dans le champ concerne plutot que d'inventer une valeur."""

SYSTEM_PROMPT_VISION = """Tu es un expert en analyse de photos de chantier BTP (batiment
et travaux publics). A partir de la photo fournie, identifie les elements
utiles a la generation d'un devis. Reponds UNIQUEMENT en JSON avec exactement
ces cles :
{
  "type_piece": "...",
  "surface_estimee_m2": ...,
  "materiaux_identifies": ["...", "..."],
  "reference_visible_oui_non": "oui" ou "non",
  "objet_compte": "..." ou null,
  "nombre_unites_estimee": ... ou null
}
Les champs objet_compte et nombre_unites_estimee servent aux elements factures
a l'unite plutot qu'au m2 (fenetres, portes, radiateurs, chaudiere, climatiseur,
etc.) : si la photo montre ce type d'element, indique dans objet_compte le nom
de l'element au pluriel (ex: "fenetres", "portes") et dans nombre_unites_estimee
le nombre d'unites visibles (entier). Si la photo ne montre pas d'element de ce
type (ex: sol, mur, cloison a carreler ou peindre), laisse ces deux champs a null.
Si un element ne peut pas etre determine avec confiance (photo floue, cadrage
insuffisant, sujet masque), indique-le explicitement dans le champ concerne
plutot que d'inventer une valeur."""


@dataclass
class DevisResult:
    contenu_json: dict
    contenu_brut: str
    provider_utilise: str
    model_utilise: str
    fallback_niveau: int
    latency_ms: float
    tentatives_echouees: list = field(default_factory=list)


@dataclass
class PhotoAnalysisResult:
    contenu_json: dict
    contenu_brut: str
    provider_utilise: str
    model_utilise: str
    fallback_niveau: int
    latency_ms: float
    tentatives_echouees: list = field(default_factory=list)


@dataclass
class TranscriptionResult:
    texte: str
    provider_utilise: str
    model_utilise: str
    fallback_niveau: int
    latency_ms: float
    tentatives_echouees: list = field(default_factory=list)


def _build_text_model(choice: ModelChoice):
    if choice.provider == "openai":
        return OpenAITextModel(choice.model_name)
    if choice.provider == "anthropic":
        return AnthropicTextModel(choice.model_name)
    if choice.provider == "mistral":
        return MistralTextModel(choice.model_name)
    if choice.provider == "gemini":
        return GeminiTextModel(choice.model_name)
    raise ValueError(f"Provider texte inconnu ou non supporte : {choice.provider}")


def _build_vision_model(choice: ModelChoice):
    if choice.provider == "openai":
        return OpenAIVisionModel(choice.model_name)
    if choice.provider == "anthropic":
        return AnthropicVisionModel(choice.model_name)
    if choice.provider == "mistral":
        return MistralVisionModel(choice.model_name)
    if choice.provider == "gemini":
        return GeminiVisionModel(choice.model_name)
    raise ValueError(f"Provider vision inconnu ou non supporte : {choice.provider}")


def _build_transcription_model(choice: ModelChoice):
    if choice.provider == "openai":
        return OpenAITranscriptionModel(choice.model_name)
    if choice.provider == "mistral_voxtral":
        return MistralVoxtralTranscriptionModel(choice.model_name)
    if choice.provider == "whisper_local":
        return WhisperLocalTranscriptionModel(choice.model_name)
    if choice.provider == "gemini":
        return GeminiTranscriptionModel(choice.model_name)
    raise ValueError(f"Provider transcription inconnu ou non supporte : {choice.provider}")


def _extraire_json(contenu: str) -> Optional[dict]:
    """JSON direct, sinon tentative d'extraction d'un bloc ```json ... ``` (meme logique que scoring_texte.py)."""
    try:
        return json.loads(contenu)
    except (json.JSONDecodeError, ValueError):
        pass
    match = re.search(r"```json\s*(.*?)```", contenu, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1).strip())
        except (json.JSONDecodeError, ValueError):
            pass
    return None


class ToolRegistry:
    """Point d'entree unifie du module Devis IA, avec fallback automatique par modalite."""

    # -----------------------------------------------------------------
    # TEXTE
    # -----------------------------------------------------------------
    def generate_devis_from_text(self, description: str, max_tokens: int = 800) -> DevisResult:
        cfg = get_config(Modality.TEXT)
        chaine = [cfg.principal] + list(cfg.fallbacks)
        tentatives_echouees: list = []

        for niveau, choix in enumerate(chaine):
            try:
                model = _build_text_model(choix)
            except ValueError as e:
                tentatives_echouees.append((choix.provider, choix.model_name, str(e)))
                continue

            start = time.perf_counter()
            try:
                response = model.generate(prompt=description, system_prompt=SYSTEM_PROMPT_TEXTE, max_tokens=max_tokens)
            except ProviderCallError as e:
                tentatives_echouees.append((choix.provider, choix.model_name, str(e)))
                continue

            latency_ms = (time.perf_counter() - start) * 1000
            contenu_json = _extraire_json(response.content)
            if contenu_json is None:
                tentatives_echouees.append((choix.provider, choix.model_name, "JSON invalide, non recuperable"))
                continue

            return DevisResult(
                contenu_json=contenu_json, contenu_brut=response.content,
                provider_utilise=choix.provider, model_utilise=choix.model_name,
                fallback_niveau=niveau, latency_ms=latency_ms, tentatives_echouees=tentatives_echouees,
            )

        raise ProviderCallError("toolregistry", f"Tous les providers texte ont echoue : {tentatives_echouees}")

    # -----------------------------------------------------------------
    # PHOTO
    # -----------------------------------------------------------------
    def analyze_photo(self, image_bytes: bytes, max_tokens: int = 500) -> PhotoAnalysisResult:
        cfg = get_config(Modality.VISION)
        chaine = [cfg.principal] + list(cfg.fallbacks)
        tentatives_echouees: list = []

        for niveau, choix in enumerate(chaine):
            try:
                model = _build_vision_model(choix)
            except ValueError as e:
                tentatives_echouees.append((choix.provider, choix.model_name, str(e)))
                continue

            start = time.perf_counter()
            try:
                response = model.analyze_image(
                    image_bytes=image_bytes,
                    prompt="Analyse cette photo de chantier selon les instructions.",
                    system_prompt=SYSTEM_PROMPT_VISION,
                    max_tokens=max_tokens,
                )
            except ProviderCallError as e:
                tentatives_echouees.append((choix.provider, choix.model_name, str(e)))
                continue

            latency_ms = (time.perf_counter() - start) * 1000
            contenu_json = _extraire_json(response.content)
            if contenu_json is None:
                tentatives_echouees.append((choix.provider, choix.model_name, "JSON invalide, non recuperable"))
                continue

            return PhotoAnalysisResult(
                contenu_json=contenu_json, contenu_brut=response.content,
                provider_utilise=choix.provider, model_utilise=choix.model_name,
                fallback_niveau=niveau, latency_ms=latency_ms, tentatives_echouees=tentatives_echouees,
            )

        raise ProviderCallError("toolregistry", f"Tous les providers vision ont echoue : {tentatives_echouees}")

    # -----------------------------------------------------------------
    # VOCAL
    # -----------------------------------------------------------------
    def transcribe_audio(self, audio_bytes: bytes, language_hint: str = "fr") -> TranscriptionResult:
        cfg = get_config(Modality.TRANSCRIPTION)
        chaine = [cfg.principal] + list(cfg.fallbacks)
        tentatives_echouees: list = []

        for niveau, choix in enumerate(chaine):
            try:
                model = _build_transcription_model(choix)
            except ValueError as e:
                tentatives_echouees.append((choix.provider, choix.model_name, str(e)))
                continue

            start = time.perf_counter()
            try:
                response = model.transcribe(audio_bytes=audio_bytes, language_hint=language_hint)
            except ProviderCallError as e:
                tentatives_echouees.append((choix.provider, choix.model_name, str(e)))
                continue

            latency_ms = (time.perf_counter() - start) * 1000

            if not response.text or not response.text.strip():
                tentatives_echouees.append((choix.provider, choix.model_name, "Transcription vide"))
                continue

            return TranscriptionResult(
                texte=response.text,
                provider_utilise=choix.provider, model_utilise=choix.model_name,
                fallback_niveau=niveau, latency_ms=latency_ms, tentatives_echouees=tentatives_echouees,
            )

        raise ProviderCallError("toolregistry", f"Tous les providers transcription ont echoue : {tentatives_echouees}")