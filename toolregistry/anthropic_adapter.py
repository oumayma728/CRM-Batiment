"""
anthropic_adapter.py — Adaptateur Anthropic pour le ToolRegistry.
"""

from __future__ import annotations

import base64
import json
import logging
import os
import time
from typing import Optional

from dotenv import load_dotenv
from anthropic import Anthropic, APIError, APITimeoutError, RateLimitError

from toolregistry.base import (
    BaseTextModel,
    BaseVisionModel,
    TextGenerationResponse,
    VisionAnalysisResponse,
    CallMetadata,
    ProviderCallError,
)

load_dotenv()

logger = logging.getLogger("toolregistry.anthropic")

_DEFAULT_TIMEOUT_SECONDS = 30.0

# Prix approximatifs en USD pour 1 million de tokens (a verifier/actualiser
# regulierement sur https://www.anthropic.com/pricing -- les tarifs changent).
_ANTHROPIC_PRICING_PER_MILLION_TOKENS = {
    "claude-opus-4-8": {"input": 5.00, "output": 25.00},
    "claude-sonnet-5": {"input": 3.00, "output": 15.00},
    "claude-sonnet-4-6": {"input": 3.00, "output": 15.00},
    "claude-haiku-4-5-20251001": {"input": 1.00, "output": 5.00},
}


def _estimate_cost(model_name: str, tokens_input: int, tokens_output: int) -> float:
    """Calcule un cout estime en euros. Fonction partagee entre texte et vision."""
    pricing = _ANTHROPIC_PRICING_PER_MILLION_TOKENS.get(model_name)
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
    JSON plutot que texte libre : ces logs sont concus pour etre relus
    par un futur systeme d'observabilite (dashboard de benchmark Phase 1),
    pas seulement par un humain qui scrolle un terminal.
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


class AnthropicTextModel(BaseTextModel):
    """Adaptateur Anthropic pour la generation de texte (Claude Sonnet, Haiku, ...)."""

    def __init__(self, model_name: str, timeout_seconds: float = _DEFAULT_TIMEOUT_SECONDS):
        self.model_name = model_name
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise ProviderCallError(
                provider="anthropic",
                message="ANTHROPIC_API_KEY manquante. Verifiez votre fichier .env.",
            )
        self._client = Anthropic(api_key=api_key, timeout=timeout_seconds)

    def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        max_tokens: int = 1000,
        temperature: float = 0.2,
    ) -> TextGenerationResponse:
        # Contrairement a OpenAI, le system prompt est un parametre a part
        # chez Anthropic, pas un message avec role "system".
        request_kwargs = {
            "model": self.model_name,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "messages": [{"role": "user", "content": prompt}],
        }
        if system_prompt:
            request_kwargs["system"] = system_prompt

        start_time = time.perf_counter()
        try:
            response = self._client.messages.create(**request_kwargs)
        except RateLimitError as e:
            latency_ms = (time.perf_counter() - start_time) * 1000
            _log_call(
                CallMetadata("anthropic", self.model_name, latency_ms),
                success=False,
                error=str(e),
            )
            raise ProviderCallError("anthropic", "Quota/limite de requetes depassee.", e) from e
        except APITimeoutError as e:
            latency_ms = (time.perf_counter() - start_time) * 1000
            _log_call(
                CallMetadata("anthropic", self.model_name, latency_ms),
                success=False,
                error=str(e),
            )
            raise ProviderCallError("anthropic", "Timeout lors de l'appel a l'API.", e) from e
        except APIError as e:
            latency_ms = (time.perf_counter() - start_time) * 1000
            _log_call(
                CallMetadata("anthropic", self.model_name, latency_ms),
                success=False,
                error=str(e),
            )
            raise ProviderCallError("anthropic", f"Erreur API Anthropic : {e}", e) from e
        except Exception as e:
            latency_ms = (time.perf_counter() - start_time) * 1000
            _log_call(
                CallMetadata("anthropic", self.model_name, latency_ms),
                success=False,
                error=str(e),
            )
            raise ProviderCallError("anthropic", f"Erreur inattendue : {e}", e) from e

        latency_ms = (time.perf_counter() - start_time) * 1000

        content = response.content[0].text if response.content else ""
        tokens_input = response.usage.input_tokens if response.usage else 0
        tokens_output = response.usage.output_tokens if response.usage else 0
        cost = _estimate_cost(self.model_name, tokens_input, tokens_output)

        metadata = CallMetadata(
            provider="anthropic",
            model_name=self.model_name,
            latency_ms=latency_ms,
            tokens_input=tokens_input,
            tokens_output=tokens_output,
            estimated_cost_eur=cost,
        )
        _log_call(metadata, success=True)
        return TextGenerationResponse(content=content, metadata=metadata)


class AnthropicVisionModel(BaseVisionModel):
    """Adaptateur Anthropic pour l'analyse d'images (Claude vision)."""

    def __init__(self, model_name: str, timeout_seconds: float = _DEFAULT_TIMEOUT_SECONDS):
        self.model_name = model_name
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise ProviderCallError(
                provider="anthropic",
                message="ANTHROPIC_API_KEY manquante. Verifiez votre fichier .env.",
            )
        self._client = Anthropic(api_key=api_key, timeout=timeout_seconds)

    def analyze_image(
        self,
        image_bytes: bytes,
        prompt: str,
        system_prompt: Optional[str] = None,
        max_tokens: int = 1000,
    ) -> VisionAnalysisResponse:
        image_base64 = base64.b64encode(image_bytes).decode("utf-8")

        request_kwargs = {
            "model": self.model_name,
            "max_tokens": max_tokens,
            "messages": [{
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": "image/jpeg",
                            "data": image_base64,
                        },
                    },
                ],
            }],
        }
        if system_prompt:
            request_kwargs["system"] = system_prompt

        start_time = time.perf_counter()
        try:
            response = self._client.messages.create(**request_kwargs)
        except RateLimitError as e:
            latency_ms = (time.perf_counter() - start_time) * 1000
            _log_call(
                CallMetadata("anthropic", self.model_name, latency_ms),
                success=False,
                error=str(e),
            )
            raise ProviderCallError("anthropic", "Quota/limite de requetes depassee.", e) from e
        except APITimeoutError as e:
            latency_ms = (time.perf_counter() - start_time) * 1000
            _log_call(
                CallMetadata("anthropic", self.model_name, latency_ms),
                success=False,
                error=str(e),
            )
            raise ProviderCallError("anthropic", "Timeout lors de l'appel a l'API.", e) from e
        except APIError as e:
            latency_ms = (time.perf_counter() - start_time) * 1000
            _log_call(
                CallMetadata("anthropic", self.model_name, latency_ms),
                success=False,
                error=str(e),
            )
            raise ProviderCallError("anthropic", f"Erreur API Anthropic : {e}", e) from e
        except Exception as e:
            latency_ms = (time.perf_counter() - start_time) * 1000
            _log_call(
                CallMetadata("anthropic", self.model_name, latency_ms),
                success=False,
                error=str(e),
            )
            raise ProviderCallError("anthropic", f"Erreur inattendue : {e}", e) from e

        latency_ms = (time.perf_counter() - start_time) * 1000

        content = response.content[0].text if response.content else ""
        tokens_input = response.usage.input_tokens if response.usage else 0
        tokens_output = response.usage.output_tokens if response.usage else 0
        cost = _estimate_cost(self.model_name, tokens_input, tokens_output)

        metadata = CallMetadata(
            provider="anthropic",
            model_name=self.model_name,
            latency_ms=latency_ms,
            tokens_input=tokens_input,
            tokens_output=tokens_output,
            estimated_cost_eur=cost,
        )
        _log_call(metadata, success=True)
        return VisionAnalysisResponse(content=content, metadata=metadata)