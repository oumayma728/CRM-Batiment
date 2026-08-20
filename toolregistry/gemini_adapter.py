"""
gemini_adapter.py — Adaptateur Google Gemini pour le ToolRegistry.

Utilise le nouveau SDK unifie "google-genai" (google-generativeai est
deprecie depuis Gemini 2.0). Couvre les 3 modalites :
- GeminiTextModel : demande par le cahier des charges (section 3.2, texte)
- GeminiVisionModel : demande par le cahier des charges (section 3.2, vision)
- GeminiTranscriptionModel : PAS demande pour la modalite vocale (Whisper
  API/auto-heberge attendus) -- ajoute en bonus, Gemini gerant nativement
  l'audio en entree via le meme endpoint multimodal.

Note historique : "gemini-2.0-flash" (cite dans le cahier des charges du
8 juin 2026) a ete retire le 1er juin 2026, puis "gemini-2.5-flash" s'est
avere indisponible aux nouveaux comptes -- modele actuellement utilise :
"gemini-3.5-flash". A revalider si ce nom change encore.

Tier gratuit : limite observee a 5 requetes/minute ET 20 requetes/jour par
projet Google Cloud (pas par cle API). La logique de retry ci-dessous gere
la limite par minute (attente + nouvelle tentative) mais PAS la limite
journaliere, qui necessite d'attendre le renouvellement (~minuit UTC) --
aucune attente en cours de script ne peut la resoudre.

BUG CRITIQUE CORRIGE (documente dans plusieurs issues GitHub officielles
google-genai, ex: googleapis/python-genai#782, #2062) : les modeles Gemini
2.5+ ont un mode de "reflexion interne" (thinking) active par defaut, dont
les tokens sont decomptes du MEME budget que max_output_tokens. Resultat
observe : sur 800 tokens alloues, le modele consommait ~96% en reflexion
invisible, ne laissant que ~27-32 tokens pour la reponse visible -- d'ou
des reponses systematiquement tronquees en plein milieu de phrase/JSON,
qui n'ont RIEN a voir avec la qualite reelle du modele sur la tache.
Corrige en passant thinking_config=ThinkingConfig(thinking_budget=0) dans
les 3 modalites (pas de raisonnement complexe necessaire pour de la
generation JSON structuree simple).
"""

from __future__ import annotations

import logging
import os
import time
from typing import Optional

from dotenv import load_dotenv
from google import genai
from google.genai import types
from google.genai.errors import APIError

from toolregistry.base import (
    BaseTextModel,
    BaseVisionModel,
    BaseTranscriptionModel,
    TextGenerationResponse,
    VisionAnalysisResponse,
    TranscriptionResponse,
    CallMetadata,
    ProviderCallError,
)

load_dotenv()

logger = logging.getLogger("toolregistry.gemini")

_DEFAULT_TIMEOUT_SECONDS = 30.0
_ATTENTE_QUOTA_MINUTE_SECONDES = 65

# Prix approximatifs en USD pour 1 million de tokens (a verifier/actualiser
# sur https://ai.google.dev/pricing -- tarifs changeants).
_GEMINI_PRICING_PER_MILLION_TOKENS = {
    "gemini-3.5-flash": {"input": 0.30, "output": 2.50},  # tarif a verifier/actualiser
}


def _get_client() -> genai.Client:
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ProviderCallError(
            provider="gemini",
            message="GEMINI_API_KEY (ou GOOGLE_API_KEY) manquante. Verifiez votre fichier .env.",
        )
    return genai.Client(api_key=api_key)


def _estimate_cost(model_name: str, tokens_input: int, tokens_output: int) -> float:
    pricing = _GEMINI_PRICING_PER_MILLION_TOKENS.get(model_name)
    if pricing is None:
        return 0.0
    cost_usd = (
        (tokens_input / 1_000_000) * pricing["input"]
        + (tokens_output / 1_000_000) * pricing["output"]
    )
    return cost_usd * 0.92


def _log_call(metadata: CallMetadata, success: bool, error: Optional[str] = None) -> None:
    log_entry = {
        "provider": metadata.provider,
        "model": metadata.model_name,
        "success": success,
        "latency_ms": round(metadata.latency_ms, 2),
        "tokens_input": metadata.tokens_input,
        "tokens_output": metadata.tokens_output,
        "estimated_cost_eur": round(metadata.estimated_cost_eur, 6),
    }
    if error:
        log_entry["error"] = error
        logger.error(str(log_entry))
    else:
        logger.info(str(log_entry))


def _generer_avec_retry(
    client: genai.Client,
    model_name: str,
    contents,
    config: Optional[types.GenerateContentConfig] = None,
    max_tentatives: int = 3,
):
    """
    Fonction partagee par les 3 modalites (texte/vision/transcription) pour
    eviter de dupliquer -- et donc risquer de casser -- la logique de retry
    a chaque nouvelle methode. Gere uniquement le quota PAR MINUTE (attente
    65s + nouvelle tentative) ; le quota JOURNALIER leve immediatement une
    ProviderCallError, aucune attente ne pouvant le resoudre en cours de script.

    Retourne (response, latency_ms) en cas de succes ; leve ProviderCallError sinon.
    """
    start_time = time.perf_counter()
    derniere_erreur: Optional[Exception] = None

    for tentative in range(max_tentatives):
        try:
            if config is not None:
                response = client.models.generate_content(model=model_name, contents=contents, config=config)
            else:
                response = client.models.generate_content(model=model_name, contents=contents)
            latency_ms = (time.perf_counter() - start_time) * 1000
            return response, latency_ms

        except APIError as e:
            derniere_erreur = e
            erreur_str = str(e)

            if "PerDay" in erreur_str:
                latency_ms = (time.perf_counter() - start_time) * 1000
                _log_call(CallMetadata("gemini", model_name, latency_ms), success=False, error=erreur_str)
                raise ProviderCallError(
                    "gemini", f"Quota JOURNALIER Gemini epuise (limite tier gratuit) : {e}", e
                ) from e

            if "RESOURCE_EXHAUSTED" in erreur_str or "429" in erreur_str:
                if tentative < max_tentatives - 1:
                    print(
                        f"    [Gemini] Quota par minute atteint, attente "
                        f"{_ATTENTE_QUOTA_MINUTE_SECONDES}s ({tentative + 1}/{max_tentatives})..."
                    )
                    time.sleep(_ATTENTE_QUOTA_MINUTE_SECONDES)
                    continue

            latency_ms = (time.perf_counter() - start_time) * 1000
            _log_call(CallMetadata("gemini", model_name, latency_ms), success=False, error=erreur_str)
            raise ProviderCallError("gemini", f"Erreur API Gemini : {e}", e) from e

        except Exception as e:
            latency_ms = (time.perf_counter() - start_time) * 1000
            _log_call(CallMetadata("gemini", model_name, latency_ms), success=False, error=str(e))
            raise ProviderCallError("gemini", f"Erreur inattendue : {e}", e) from e

    latency_ms = (time.perf_counter() - start_time) * 1000
    _log_call(CallMetadata("gemini", model_name, latency_ms), success=False, error=str(derniere_erreur))
    raise ProviderCallError(
        "gemini", f"Erreur API Gemini apres {max_tentatives} tentatives : {derniere_erreur}", derniere_erreur
    )


def _extraire_metadata_reponse(response, model_name: str, latency_ms: float) -> CallMetadata:
    usage = getattr(response, "usage_metadata", None)
    tokens_input = getattr(usage, "prompt_token_count", 0) or 0
    tokens_output = getattr(usage, "candidates_token_count", 0) or 0
    cost = _estimate_cost(model_name, tokens_input, tokens_output)
    return CallMetadata(
        provider="gemini", model_name=model_name, latency_ms=latency_ms,
        tokens_input=tokens_input, tokens_output=tokens_output, estimated_cost_eur=cost,
    )


class GeminiTextModel(BaseTextModel):
    """Adaptateur Gemini pour la generation de texte (gemini-3.5-flash, ...)."""

    def __init__(self, model_name: str, timeout_seconds: float = _DEFAULT_TIMEOUT_SECONDS):
        self.model_name = model_name
        self._client = _get_client()

    def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        max_tokens: int = 1000,
        temperature: float = 0.2,
        max_tentatives: int = 3,
    ) -> TextGenerationResponse:
        config = types.GenerateContentConfig(
            system_instruction=system_prompt,
            max_output_tokens=max_tokens,
            temperature=temperature,
            # Desactive le "thinking" (reflexion interne) -- sans ca, ses
            # tokens sont decomptes du meme budget que max_output_tokens et
            # peuvent tronquer la reponse visible avant qu'elle soit ecrite.
            # Pas necessaire pour une generation JSON simple comme la notre.
            thinking_config=types.ThinkingConfig(thinking_budget=0),
        )

        response, latency_ms = _generer_avec_retry(
            self._client, self.model_name, prompt, config=config, max_tentatives=max_tentatives
        )

        content = response.text or ""
        metadata = _extraire_metadata_reponse(response, self.model_name, latency_ms)
        _log_call(metadata, success=True)
        return TextGenerationResponse(content=content, metadata=metadata)


class GeminiVisionModel(BaseVisionModel):
    """Adaptateur Gemini pour l'analyse d'images."""

    def __init__(self, model_name: str, timeout_seconds: float = _DEFAULT_TIMEOUT_SECONDS):
        self.model_name = model_name
        self._client = _get_client()

    def analyze_image(
        self,
        image_bytes: bytes,
        prompt: str,
        system_prompt: Optional[str] = None,
        max_tokens: int = 1000,
        max_tentatives: int = 3,
    ) -> VisionAnalysisResponse:
        config = types.GenerateContentConfig(
            system_instruction=system_prompt,
            max_output_tokens=max_tokens,
            thinking_config=types.ThinkingConfig(thinking_budget=0),
        )
        contents = [
            types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg"),
            types.Part.from_text(text=prompt),
        ]

        response, latency_ms = _generer_avec_retry(
            self._client, self.model_name, contents, config=config, max_tentatives=max_tentatives
        )

        content = response.text or ""
        metadata = _extraire_metadata_reponse(response, self.model_name, latency_ms)
        _log_call(metadata, success=True)
        return VisionAnalysisResponse(content=content, metadata=metadata)


class GeminiTranscriptionModel(BaseTranscriptionModel):
    """
    Adaptateur Gemini pour la transcription vocale (audio en entree native,
    meme endpoint multimodal). PAS demande par le cahier des charges pour
    la modalite vocale -- ajoute en bonus, meme logique que Voxtral.
    """

    def __init__(self, model_name: str = "gemini-3.5-flash"):
        self.model_name = model_name
        self._client = _get_client()

    def transcribe(
        self,
        audio_bytes: bytes,
        language_hint: Optional[str] = "fr",
        max_tentatives: int = 3,
    ) -> TranscriptionResponse:
        config = types.GenerateContentConfig(
            thinking_config=types.ThinkingConfig(thinking_budget=0),
        )
        contents = [
            types.Part.from_bytes(data=audio_bytes, mime_type="audio/mp3"),
            types.Part.from_text(text="Transcris exactement ce qui est dit dans cet audio, mot pour mot, en francais."),
        ]

        response, latency_ms = _generer_avec_retry(
            self._client, self.model_name, contents, config=config, max_tentatives=max_tentatives
        )

        texte = response.text or ""
        metadata = _extraire_metadata_reponse(response, self.model_name, latency_ms)
        _log_call(metadata, success=True)
        return TranscriptionResponse(text=texte, metadata=metadata, detected_language=language_hint)