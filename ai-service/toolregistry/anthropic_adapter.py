"""
Adapter Anthropic : texte + vision via Claude (Sonnet 3.7 / Haiku 3.5).
Ne supporte PAS la transcription audio nativement (pas d'API audio Anthropic) —
transcribe_audio() n'est donc pas implémenté sur cet adapter.

Exigence tâche : "Implémenter Anthropic adapter avec les mêmes signatures de
méthode, ajouter gestion des erreurs, des timeouts et logging structuré pour
chaque appel API."
"""
import json
from typing import Optional

from anthropic import Anthropic, APITimeoutError, APIError

from .base import BaseTextModel, BaseVisionModel, DevisGenerationResult, PhotoAnalysisResult
from .exceptions import ProviderTimeoutError, ProviderAPIError
from .logging_utils import log_api_call

DEFAULT_TIMEOUT_SECONDS = 30.0

# Candidats de benchmark nommés explicitement dans le CDC (Phase 1, section 3.2) :
# Claude Sonnet 3.7 et Claude Haiku 3.5. Identifiants API vérifiés sur docs.claude.com.
DEFAULT_TEXT_MODEL = "claude-3-5-haiku-20241022"   # Claude Haiku 3.5
DEFAULT_VISION_MODEL = "claude-3-7-sonnet-20250219"  # Claude Sonnet 3.7


class AnthropicAdapter(BaseTextModel, BaseVisionModel):
    """
    Adapter Anthropic couvrant texte + vision.
    Mêmes signatures de méthode que OpenAIAdapter/GoogleAdapter pour rester
    interchangeable via le ToolRegistry, sans jamais toucher au code métier.
    """

    def __init__(
        self,
        api_key: str,
        text_model: str = DEFAULT_TEXT_MODEL,
        vision_model: str = DEFAULT_VISION_MODEL,
        timeout_seconds: float = DEFAULT_TIMEOUT_SECONDS,
    ):
        self._client = Anthropic(api_key=api_key, timeout=timeout_seconds)
        self.text_model = text_model
        self.vision_model = vision_model
        self.timeout_seconds = timeout_seconds

    def generate_devis_from_text(
        self,
        description: str,
        system_prompt: Optional[str] = None,
        max_tokens: int = 1000,
    ) -> DevisGenerationResult:
        with log_api_call("anthropic", self.text_model, "texte") as ctx:
            try:
                response = self._client.messages.create(
                    model=self.text_model,
                    max_tokens=max_tokens,
                    system=system_prompt or "",
                    messages=[{"role": "user", "content": description}],
                )
            except APITimeoutError as e:
                raise ProviderTimeoutError("anthropic", self.text_model, self.timeout_seconds) from e
            except APIError as e:
                raise ProviderAPIError("anthropic", self.text_model, e) from e

            raw_json = _extract_json(response.content[0].text)

            return DevisGenerationResult(
                raw_json=raw_json,
                provider="anthropic",
                model=self.text_model,
                latence_ms=ctx.get("latence_ms", 0.0),
                tokens_input=response.usage.input_tokens,
                tokens_output=response.usage.output_tokens,
            )

    def analyze_photo(
        self,
        image_base64: str,
        prompt: Optional[str] = None,
    ) -> PhotoAnalysisResult:
        with log_api_call("anthropic", self.vision_model, "photo") as ctx:
            try:
                response = self._client.messages.create(
                    model=self.vision_model,
                    max_tokens=800,
                    messages=[
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "image",
                                    "source": {
                                        "type": "base64",
                                        "media_type": "image/jpeg",
                                        "data": image_base64,
                                    },
                                },
                                {"type": "text", "text": prompt or ""},
                            ],
                        }
                    ],
                )
            except APITimeoutError as e:
                raise ProviderTimeoutError("anthropic", self.vision_model, self.timeout_seconds) from e
            except APIError as e:
                raise ProviderAPIError("anthropic", self.vision_model, e) from e

            raw_json = _extract_json(response.content[0].text)

            return PhotoAnalysisResult(
                type_piece=raw_json.get("type_piece"),
                surface_estimee_m2=raw_json.get("surface_estimee_m2"),
                materiaux_identifies=raw_json.get("materiaux_identifies", []),
                reference_visible=raw_json.get("reference_visible"),
                raw_json=raw_json,
                provider="anthropic",
                model=self.vision_model,
                latence_ms=ctx.get("latence_ms", 0.0),
                tokens_input=response.usage.input_tokens,
                tokens_output=response.usage.output_tokens,
            )


def _extract_json(text: str) -> dict:
    """
    Extrait un objet JSON d'une réponse texte Claude.
    Contrairement à l'API OpenAI (response_format=json_object), l'API Anthropic
    ne force pas nativement le JSON — Claude peut entourer sa réponse de
    ```json ... ``` malgré la consigne dans le prompt système. On nettoie donc
    ces éventuelles balises avant de parser.
    """
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("```")[1]
        if cleaned.startswith("json"):
            cleaned = cleaned[4:]
    return json.loads(cleaned.strip())
