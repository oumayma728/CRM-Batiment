"""
whisper_local_adapter.py — Adaptateur Whisper auto-heberge (large-v3) pour
le ToolRegistry, via la librairie faster-whisper (CTranslate2 -- nettement
plus rapide que le package openai-whisper officiel sur CPU).

Installation requise : pip install faster-whisper --break-system-packages
"""

from __future__ import annotations

import io
import time
from typing import Optional

from toolregistry.base import (
    BaseTranscriptionModel,
    TranscriptionResponse,
    CallMetadata,
    ProviderCallError,
)


class WhisperLocalTranscriptionModel(BaseTranscriptionModel):
    """
    Whisper large-v3 execute localement (pas d'appel reseau, pas de cout
    par appel -- seul le temps de calcul CPU/GPU compte).
    """

    def __init__(self, model_name: str = "large-v3", device: str = "cpu", compute_type: str = "int8"):
        self.model_name = model_name
        try:
            from faster_whisper import WhisperModel
        except ImportError as e:
            raise ProviderCallError(
                "whisper_local",
                "Package faster-whisper manquant. Installez avec : "
                "pip install faster-whisper --break-system-packages",
                e,
            ) from e

        # compute_type="int8" : bon compromis vitesse/precision sur CPU.
        # Passer device="cuda", compute_type="float16" si un GPU NVIDIA est disponible.
        self._model = WhisperModel(model_name, device=device, compute_type=compute_type)

    def transcribe(
        self,
        audio_bytes: bytes,
        language_hint: Optional[str] = "fr",
    ) -> TranscriptionResponse:
        start_time = time.perf_counter()
        try:
            segments, info = self._model.transcribe(
                io.BytesIO(audio_bytes),
                language=language_hint,
            )
            texte = " ".join(segment.text.strip() for segment in segments)
        except Exception as e:
            latency_ms = (time.perf_counter() - start_time) * 1000
            raise ProviderCallError("whisper_local", f"Erreur transcription locale : {e}", e) from e

        latency_ms = (time.perf_counter() - start_time) * 1000

        metadata = CallMetadata(
            provider="whisper_local",
            model_name=self.model_name,
            latency_ms=latency_ms,
            tokens_input=0,
            tokens_output=0,
            estimated_cost_eur=0.0,  # execution locale, pas de facturation par appel
        )
        return TranscriptionResponse(
            text=texte,
            metadata=metadata,
            detected_language=getattr(info, "language", language_hint),
        )