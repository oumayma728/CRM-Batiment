"""
mistral_adapter.py — Adaptateur Mistral pour le ToolRegistry.

Ajoute a des fins de test reel (Mistral propose un tier gratuit
rate-limited, contrairement aux petits credits ponctuels OpenAI/Anthropic).
Le cahier des charges n'exige que 2 providers minimum (OpenAI + Anthropic) --
Mistral est un ajout pratique, pas une exigence, pour les 3 modalites
(texte, vision, transcription).
"""

from __future__ import annotations

import base64
import json
import logging
import os
import time
from typing import Optional

import requests
from dotenv import load_dotenv
from mistralai.client import Mistral
from mistralai.client.errors import SDKError

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

logger = logging.getLogger("toolregistry.mistral")

_DEFAULT_TIMEOUT_SECONDS = 30.0

# Prix approximatifs en USD pour 1 million de tokens (a verifier/actualiser
# sur https://mistral.ai/products/la-plateforme#pricing -- tarifs changeants,
# et Mistral est reconnu pour etre nettement moins cher que OpenAI/Anthropic).
_MISTRAL_PRICING_PER_MILLION_TOKENS = {
    "pixtral-12b-2409": {"input": 0.15, "output": 0.15},
    "mistral-small-latest": {"input": 0.10, "output": 0.30},
    "mistral-large-latest": {"input": 2.00, "output": 6.00},
}

# Transcription Voxtral : facture a la minute, pas aux tokens.
_VOXTRAL_ENDPOINT = "https://api.mistral.ai/v1/audio/transcriptions"
_VOXTRAL_PRIX_USD_PAR_MINUTE = 0.003


def _estimate_cost(model_name: str, tokens_input: int, tokens_output: int) -> float:
    pricing = _MISTRAL_PRICING_PER_MILLION_TOKENS.get(model_name)
    if pricing is None:
        return 0.0
    cost_usd = (
        (tokens_input / 1_000_000) * pricing["input"]
        + (tokens_output / 1_000_000) * pricing["output"]
    )
    return cost_usd * 0.92


def _log_call(metadata: CallMetadata, success: bool, error: Optional[str] = None) -> None:
    """Meme format JSON que les adaptateurs OpenAI/Anthropic -- logs comparables entre tous les providers."""
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
        logger.error(json.dumps(log_entry))
    else:
        logger.info(json.dumps(log_entry))


class MistralTextModel(BaseTextModel):
    """Adaptateur Mistral pour la generation de texte (mistral-small, mistral-large, ...)."""

    def __init__(self, model_name: str, timeout_seconds: float = _DEFAULT_TIMEOUT_SECONDS):
        self.model_name = model_name
        api_key = os.getenv("MISTRAL_API_KEY")
        if not api_key:
            raise ProviderCallError(
                provider="mistral",
                message="MISTRAL_API_KEY manquante. Verifiez votre fichier .env.",
            )
        self._client = Mistral(api_key=api_key, timeout_ms=int(timeout_seconds * 1000))

    def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        max_tokens: int = 1000,
        temperature: float = 0.2,
    ) -> TextGenerationResponse:
        # Mistral suit le format OpenAI : le system prompt est un message
        # avec role "system" dans le tableau messages, pas un parametre a part
        # (contrairement a Anthropic).
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        start_time = time.perf_counter()
        try:
            response = self._client.chat.complete(
                model=self.model_name,
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
            )
        except SDKError as e:
            latency_ms = (time.perf_counter() - start_time) * 1000
            status_code = getattr(e, "status_code", None)
            _log_call(
                CallMetadata("mistral", self.model_name, latency_ms),
                success=False,
                error=str(e),
            )
            if status_code == 429:
                raise ProviderCallError("mistral", "Quota/limite de requetes depassee.", e) from e
            raise ProviderCallError("mistral", f"Erreur API Mistral : {e}", e) from e
        except Exception as e:
            latency_ms = (time.perf_counter() - start_time) * 1000
            _log_call(
                CallMetadata("mistral", self.model_name, latency_ms),
                success=False,
                error=str(e),
            )
            raise ProviderCallError("mistral", f"Erreur inattendue : {e}", e) from e

        latency_ms = (time.perf_counter() - start_time) * 1000

        content = response.choices[0].message.content or ""
        tokens_input = response.usage.prompt_tokens if response.usage else 0
        tokens_output = response.usage.completion_tokens if response.usage else 0
        cost = _estimate_cost(self.model_name, tokens_input, tokens_output)

        metadata = CallMetadata(
            provider="mistral",
            model_name=self.model_name,
            latency_ms=latency_ms,
            tokens_input=tokens_input,
            tokens_output=tokens_output,
            estimated_cost_eur=cost,
        )
        _log_call(metadata, success=True)
        return TextGenerationResponse(content=content, metadata=metadata)


class MistralVisionModel(BaseVisionModel):
    """
    Adaptateur Mistral pour l'analyse d'images (famille Pixtral).
    Absent du cahier des charges (GPT-4o, Claude Sonnet 3.7, Gemini 2.0 Flash
    attendus) -- ajoute en pratique faute de credits OpenAI/Anthropic, comme
    MistralTextModel pour la modalite texte.
    """

    def __init__(self, model_name: str, timeout_seconds: float = _DEFAULT_TIMEOUT_SECONDS):
        self.model_name = model_name
        api_key = os.getenv("MISTRAL_API_KEY")
        if not api_key:
            raise ProviderCallError(
                provider="mistral",
                message="MISTRAL_API_KEY manquante. Verifiez votre fichier .env.",
            )
        self._client = Mistral(api_key=api_key, timeout_ms=int(timeout_seconds * 1000))

    def analyze_image(
        self,
        image_bytes: bytes,
        prompt: str,
        system_prompt: Optional[str] = None,
        max_tokens: int = 1000,
    ) -> VisionAnalysisResponse:
        image_base64 = base64.b64encode(image_bytes).decode("utf-8")

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({
            "role": "user",
            "content": [
                {"type": "text", "text": prompt},
                {"type": "image_url", "image_url": f"data:image/jpeg;base64,{image_base64}"},
            ],
        })

        start_time = time.perf_counter()
        try:
            response = self._client.chat.complete(
                model=self.model_name,
                messages=messages,
                max_tokens=max_tokens,
            )
        except SDKError as e:
            latency_ms = (time.perf_counter() - start_time) * 1000
            status_code = getattr(e, "status_code", None)
            _log_call(CallMetadata("mistral", self.model_name, latency_ms), success=False, error=str(e))
            if status_code == 429:
                raise ProviderCallError("mistral", "Quota/limite de requetes depassee.", e) from e
            raise ProviderCallError("mistral", f"Erreur API Mistral vision : {e}", e) from e
        except Exception as e:
            latency_ms = (time.perf_counter() - start_time) * 1000
            _log_call(CallMetadata("mistral", self.model_name, latency_ms), success=False, error=str(e))
            raise ProviderCallError("mistral", f"Erreur inattendue : {e}", e) from e

        latency_ms = (time.perf_counter() - start_time) * 1000
        content = response.choices[0].message.content or ""
        tokens_input = response.usage.prompt_tokens if response.usage else 0
        tokens_output = response.usage.completion_tokens if response.usage else 0
        cost = _estimate_cost(self.model_name, tokens_input, tokens_output)

        metadata = CallMetadata(
            provider="mistral",
            model_name=self.model_name,
            latency_ms=latency_ms,
            tokens_input=tokens_input,
            tokens_output=tokens_output,
            estimated_cost_eur=cost,
        )
        _log_call(metadata, success=True)
        return VisionAnalysisResponse(content=content, metadata=metadata)


class MistralVoxtralTranscriptionModel(BaseTranscriptionModel):
    """
    Adaptateur Mistral Voxtral pour la transcription vocale, via l'endpoint
    REST direct (pas de methode SDK confirmee dans mistralai pour l'instant --
    appel HTTP direct, plus fiable que de deviner une signature SDK non
    verifiee). Absent du cahier des charges (Whisper API vs Whisper
    auto-heberge attendus) -- ajoute en pratique, meme logique que
    MistralTextModel/MistralVisionModel avant lui.
    """

    def __init__(self, model_name: str = "voxtral-mini-latest"):
        self.model_name = model_name
        self._api_key = os.getenv("MISTRAL_API_KEY")
        if not self._api_key:
            raise ProviderCallError("mistral_voxtral", "MISTRAL_API_KEY manquante. Verifiez votre fichier .env.")

    def transcribe(self, audio_bytes: bytes, language_hint: Optional[str] = "fr") -> TranscriptionResponse:
        start_time = time.perf_counter()
        try:
            response = requests.post(
                _VOXTRAL_ENDPOINT,
                headers={"Authorization": f"Bearer {self._api_key}"},
                files={"file": ("audio.mp3", audio_bytes, "audio/mpeg")},
                data={"model": self.model_name},
                timeout=60,
            )
            response.raise_for_status()
            data = response.json()
        except requests.exceptions.RequestException as e:
            latency_ms = (time.perf_counter() - start_time) * 1000
            _log_call(CallMetadata("mistral_voxtral", self.model_name, latency_ms), success=False, error=str(e))
            raise ProviderCallError("mistral_voxtral", f"Erreur API Voxtral : {e}", e) from e

        latency_ms = (time.perf_counter() - start_time) * 1000
        texte = data.get("text", "")

        metadata = CallMetadata(
            provider="mistral_voxtral",
            model_name=self.model_name,
            latency_ms=latency_ms,
            tokens_input=0,
            tokens_output=0,
            estimated_cost_eur=0.0,  # calcule cote script appelant (facturation a la minute, pas aux tokens)
        )
        _log_call(metadata, success=True)
        return TranscriptionResponse(text=texte, metadata=metadata, detected_language=language_hint)