"""
openai_adapter.py — Adaptateur OpenAI pour le ToolRegistry.
"""

from __future__ import annotations

import base64
import io
import json
import logging
import os
import time
from typing import Optional

from dotenv import load_dotenv
from openai import OpenAI, APIError, APITimeoutError, RateLimitError

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

logger = logging.getLogger("toolregistry.openai")
_DEFAULT_TIMEOUT_SECONDS = 30.0

# Prix approximatifs en USD pour 1 million de tokens (a verifier/actualiser
# regulierement sur https://openai.com/api/pricing -- les tarifs changent).
_OPENAI_PRICING_PER_MILLION_TOKENS = {
    "gpt-4o": {"input": 2.50, "output": 10.00},
    "gpt-4o-mini": {"input": 0.15, "output": 0.60},
}


def _estimate_cost(model_name: str, tokens_input: int, tokens_output: int) -> float:
    """
    Calcule un cout estime en euros pour un appel donne.
    Fonction independante (pas une methode) car reutilisee identiquement
    par les classes texte et vision -- eviter la duplication de logique.
    """
    pricing = _OPENAI_PRICING_PER_MILLION_TOKENS.get(model_name)
    if pricing is None:
        return 0.0
    cost_usd = (
        (tokens_input / 1_000_000) * pricing["input"]
        + (tokens_output / 1_000_000) * pricing["output"]
    )
    return cost_usd * 0.92  # conversion approximative USD -> EUR


def _log_call(metadata: CallMetadata, success: bool, error: Optional[str] = None) -> None:
    """
    Log structure (JSON) pour chaque appel API, succes ou echec.
    Meme format que l'adaptateur Anthropic, pour que les logs des deux
    providers soient directement comparables/agregables ensemble.
    """
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


class OpenAITextModel(BaseTextModel):
    """Adaptateur OpenAI pour la generation de texte (GPT-4o, GPT-4o-mini, ...)."""

    def __init__(self, model_name: str, timeout_seconds: float = _DEFAULT_TIMEOUT_SECONDS):
        self.model_name = model_name
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ProviderCallError(
                provider="openai",
                message="OPENAI_API_KEY manquante. Verifiez votre fichier .env.",
            )
        self._client = OpenAI(api_key=api_key, timeout=timeout_seconds)

    def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        max_tokens: int = 1000,
        temperature: float = 0.2,
    ) -> TextGenerationResponse:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        start_time = time.perf_counter()
        try:
            response = self._client.chat.completions.create(
                model=self.model_name,
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
            )
        except RateLimitError as e:
            latency_ms = (time.perf_counter() - start_time) * 1000
            _log_call(CallMetadata("openai", self.model_name, latency_ms), success=False, error=str(e))
            raise ProviderCallError("openai", "Quota/limite de requetes depassee.", e) from e
        except APITimeoutError as e:
            latency_ms = (time.perf_counter() - start_time) * 1000
            _log_call(CallMetadata("openai", self.model_name, latency_ms), success=False, error=str(e))
            raise ProviderCallError("openai", "Timeout lors de l'appel a l'API.", e) from e
        except APIError as e:
            latency_ms = (time.perf_counter() - start_time) * 1000
            _log_call(CallMetadata("openai", self.model_name, latency_ms), success=False, error=str(e))
            raise ProviderCallError("openai", f"Erreur API OpenAI : {e}", e) from e
        except Exception as e:
            latency_ms = (time.perf_counter() - start_time) * 1000
            _log_call(CallMetadata("openai", self.model_name, latency_ms), success=False, error=str(e))
            raise ProviderCallError("openai", f"Erreur inattendue : {e}", e) from e

        latency_ms = (time.perf_counter() - start_time) * 1000

        content = response.choices[0].message.content or ""
        tokens_input = response.usage.prompt_tokens if response.usage else 0
        tokens_output = response.usage.completion_tokens if response.usage else 0
        cost = _estimate_cost(self.model_name, tokens_input, tokens_output)

        metadata = CallMetadata(
            provider="openai",
            model_name=self.model_name,
            latency_ms=latency_ms,
            tokens_input=tokens_input,
            tokens_output=tokens_output,
            estimated_cost_eur=cost,
        )
        _log_call(metadata, success=True)
        return TextGenerationResponse(content=content, metadata=metadata)


class OpenAIVisionModel(BaseVisionModel):
    """Adaptateur OpenAI pour l'analyse d'images (GPT-4o vision)."""

    def __init__(self, model_name: str, timeout_seconds: float = _DEFAULT_TIMEOUT_SECONDS):
        self.model_name = model_name
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ProviderCallError(
                provider="openai",
                message="OPENAI_API_KEY manquante. Verifiez votre fichier .env.",
            )
        self._client = OpenAI(api_key=api_key, timeout=timeout_seconds)

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
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"},
                },
            ],
        })

        start_time = time.perf_counter()
        try:
            response = self._client.chat.completions.create(
                model=self.model_name,
                messages=messages,
                max_tokens=max_tokens,
            )
        except RateLimitError as e:
            latency_ms = (time.perf_counter() - start_time) * 1000
            _log_call(CallMetadata("openai", self.model_name, latency_ms), success=False, error=str(e))
            raise ProviderCallError("openai", "Quota/limite de requetes depassee.", e) from e
        except APITimeoutError as e:
            latency_ms = (time.perf_counter() - start_time) * 1000
            _log_call(CallMetadata("openai", self.model_name, latency_ms), success=False, error=str(e))
            raise ProviderCallError("openai", "Timeout lors de l'appel a l'API.", e) from e
        except APIError as e:
            latency_ms = (time.perf_counter() - start_time) * 1000
            _log_call(CallMetadata("openai", self.model_name, latency_ms), success=False, error=str(e))
            raise ProviderCallError("openai", f"Erreur API OpenAI : {e}", e) from e
        except Exception as e:
            latency_ms = (time.perf_counter() - start_time) * 1000
            _log_call(CallMetadata("openai", self.model_name, latency_ms), success=False, error=str(e))
            raise ProviderCallError("openai", f"Erreur inattendue : {e}", e) from e

        latency_ms = (time.perf_counter() - start_time) * 1000

        content = response.choices[0].message.content or ""
        tokens_input = response.usage.prompt_tokens if response.usage else 0
        tokens_output = response.usage.completion_tokens if response.usage else 0
        cost = _estimate_cost(self.model_name, tokens_input, tokens_output)

        metadata = CallMetadata(
            provider="openai",
            model_name=self.model_name,
            latency_ms=latency_ms,
            tokens_input=tokens_input,
            tokens_output=tokens_output,
            estimated_cost_eur=cost,
        )
        _log_call(metadata, success=True)
        return VisionAnalysisResponse(content=content, metadata=metadata)


class OpenAITranscriptionModel(BaseTranscriptionModel):
    """Adaptateur OpenAI pour la transcription vocale (Whisper API)."""

    def __init__(self, model_name: str = "whisper-1", timeout_seconds: float = _DEFAULT_TIMEOUT_SECONDS):
        self.model_name = model_name
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ProviderCallError(
                provider="openai",
                message="OPENAI_API_KEY manquante. Verifiez votre fichier .env.",
            )
        self._client = OpenAI(api_key=api_key, timeout=timeout_seconds)

    def transcribe(
        self,
        audio_bytes: bytes,
        language_hint: Optional[str] = "fr",
    ) -> TranscriptionResponse:
        audio_file = io.BytesIO(audio_bytes)
        audio_file.name = "audio.mp3"  # l'API exige un nom de fichier avec extension

        start_time = time.perf_counter()
        try:
            response = self._client.audio.transcriptions.create(
                model=self.model_name,
                file=audio_file,
                language=language_hint,
            )
        except RateLimitError as e:
            latency_ms = (time.perf_counter() - start_time) * 1000
            _log_call(CallMetadata("openai", self.model_name, latency_ms), success=False, error=str(e))
            raise ProviderCallError("openai", "Quota/limite de requetes depassee.", e) from e
        except APITimeoutError as e:
            latency_ms = (time.perf_counter() - start_time) * 1000
            _log_call(CallMetadata("openai", self.model_name, latency_ms), success=False, error=str(e))
            raise ProviderCallError("openai", "Timeout lors de l'appel a l'API.", e) from e
        except APIError as e:
            latency_ms = (time.perf_counter() - start_time) * 1000
            _log_call(CallMetadata("openai", self.model_name, latency_ms), success=False, error=str(e))
            raise ProviderCallError("openai", f"Erreur API Whisper : {e}", e) from e
        except Exception as e:
            latency_ms = (time.perf_counter() - start_time) * 1000
            _log_call(CallMetadata("openai", self.model_name, latency_ms), success=False, error=str(e))
            raise ProviderCallError("openai", f"Erreur inattendue : {e}", e) from e

        latency_ms = (time.perf_counter() - start_time) * 1000

        metadata = CallMetadata(
            provider="openai",
            model_name=self.model_name,
            latency_ms=latency_ms,
            tokens_input=0,
            tokens_output=0,
            estimated_cost_eur=0.0,  # Whisper facture a la duree audio, pas aux tokens
        )
        _log_call(metadata, success=True)
        return TranscriptionResponse(
            text=response.text,
            metadata=metadata,
            detected_language=language_hint,
        )