"""
Adapter OpenAI : implémente les 3 modalités (texte, vision, transcription)
via GPT-4o / GPT-4o-mini pour texte+vision, et Whisper pour la transcription.

Exigence tâche : "Implémenter OpenAI adapter avec méthodes
generate_devis_from_text(), analyze_photo(), transcribe_audio() utilisant
GPT-4o et Whisper".
"""
import io
import json
from typing import Optional

from openai import OpenAI, APITimeoutError, APIError

from .base import (
    BaseTextModel,
    BaseVisionModel,
    BaseTranscriptionModel,
    DevisGenerationResult,
    PhotoAnalysisResult,
    TranscriptionResult,
)
from .exceptions import ProviderTimeoutError, ProviderAPIError
from .logging_utils import log_api_call

DEFAULT_TIMEOUT_SECONDS = 30.0

# Candidats de benchmark nommés explicitement dans le CDC (Phase 1, section 3.2).
DEFAULT_TEXT_MODEL = "gpt-4o-mini"
DEFAULT_VISION_MODEL = "gpt-4o"
DEFAULT_TRANSCRIPTION_MODEL = "whisper-1"


class OpenAIAdapter(BaseTextModel, BaseVisionModel, BaseTranscriptionModel):
    """
    Adapter unique pour OpenAI, couvrant les 3 modalités.
    Le modèle texte/vision/transcription est paramétrable pour permettre
    au benchmark de tester GPT-4o ET GPT-4o-mini avec le même adapter.
    """

    def __init__(
        self,
        api_key: str,
        text_model: str = DEFAULT_TEXT_MODEL,
        vision_model: str = DEFAULT_VISION_MODEL,
        transcription_model: str = DEFAULT_TRANSCRIPTION_MODEL,
        timeout_seconds: float = DEFAULT_TIMEOUT_SECONDS,
    ):
        self._client = OpenAI(api_key=api_key, timeout=timeout_seconds)
        self.text_model = text_model
        self.vision_model = vision_model
        self.transcription_model = transcription_model
        self.timeout_seconds = timeout_seconds

    def generate_devis_from_text(
        self,
        description: str,
        system_prompt: Optional[str] = None,
        max_tokens: int = 1000,
    ) -> DevisGenerationResult:
        with log_api_call("openai", self.text_model, "texte") as ctx:
            try:
                response = self._client.chat.completions.create(
                    model=self.text_model,
                    max_tokens=max_tokens,
                    response_format={"type": "json_object"},
                    messages=[
                        {"role": "system", "content": system_prompt or ""},
                        {"role": "user", "content": description},
                    ],
                )
            except APITimeoutError as e:
                raise ProviderTimeoutError("openai", self.text_model, self.timeout_seconds) from e
            except APIError as e:
                raise ProviderAPIError("openai", self.text_model, e) from e

            ctx["tokens_input"] = response.usage.prompt_tokens
            ctx["tokens_output"] = response.usage.completion_tokens
            raw_json = json.loads(response.choices[0].message.content)

            return DevisGenerationResult(
                raw_json=raw_json,
                provider="openai",
                model=self.text_model,
                latence_ms=ctx.get("latence_ms", 0.0),
                tokens_input=response.usage.prompt_tokens,
                tokens_output=response.usage.completion_tokens,
            )

    def analyze_photo(
        self,
        image_base64: str,
        prompt: Optional[str] = None,
    ) -> PhotoAnalysisResult:
        with log_api_call("openai", self.vision_model, "photo") as ctx:
            try:
                response = self._client.chat.completions.create(
                    model=self.vision_model,
                    max_tokens=800,
                    response_format={"type": "json_object"},
                    messages=[
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": prompt or ""},
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:image/jpeg;base64,{image_base64}"
                                    },
                                },
                            ],
                        }
                    ],
                )
            except APITimeoutError as e:
                raise ProviderTimeoutError("openai", self.vision_model, self.timeout_seconds) from e
            except APIError as e:
                raise ProviderAPIError("openai", self.vision_model, e) from e

            raw_json = json.loads(response.choices[0].message.content)

            return PhotoAnalysisResult(
                type_piece=raw_json.get("type_piece"),
                surface_estimee_m2=raw_json.get("surface_estimee_m2"),
                materiaux_identifies=raw_json.get("materiaux_identifies", []),
                reference_visible=raw_json.get("reference_visible"),
                raw_json=raw_json,
                provider="openai",
                model=self.vision_model,
                latence_ms=ctx.get("latence_ms", 0.0),
                tokens_input=response.usage.prompt_tokens,
                tokens_output=response.usage.completion_tokens,
            )

    def transcribe_audio(
        self,
        audio_bytes: bytes,
        audio_format: str = "wav",
    ) -> TranscriptionResult:
        with log_api_call("openai", self.transcription_model, "vocal") as ctx:
            audio_file = io.BytesIO(audio_bytes)
            audio_file.name = f"audio.{audio_format}"
            try:
                response = self._client.audio.transcriptions.create(
                    model=self.transcription_model,
                    file=audio_file,
                )
            except APITimeoutError as e:
                raise ProviderTimeoutError(
                    "openai", self.transcription_model, self.timeout_seconds
                ) from e
            except APIError as e:
                raise ProviderAPIError("openai", self.transcription_model, e) from e

            return TranscriptionResult(
                transcription_texte=response.text,
                confidence_score=None,  # Whisper API OpenAI ne retourne pas de score
                duration_seconds=None,
                provider="openai",
                model=self.transcription_model,
                latence_ms=ctx.get("latence_ms", 0.0),
            )
