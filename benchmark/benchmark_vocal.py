"""
benchmark_vocal.py — Sous-tache 1 (Tache Vocal, Phase 1) : compare Whisper
API OpenAI vs Whisper auto-heberge (vs Mistral Voxtral, ajoute en pratique)
sur les enregistrements vocaux.

Cout : Whisper API facture a la duree audio (pas aux tokens), sur le meme
compte OpenAI que GPT-4o -- donc bloque tant qu'il n'y a pas de credit.
Whisper auto-heberge est gratuit (calcul local), latence dependante du
CPU/GPU disponible. Voxtral facture a la minute (0.003 USD/min).
"""

from __future__ import annotations

import argparse
import json
import random
import time
from pathlib import Path
from typing import Optional

from toolregistry.base import BaseTranscriptionModel, CallMetadata, TranscriptionResponse, ProviderCallError
from toolregistry.openai_adapter import OpenAITranscriptionModel
from toolregistry.whisper_local_adapter import WhisperLocalTranscriptionModel
from toolregistry.mistral_adapter import MistralVoxtralTranscriptionModel

MODELS = [
    ("Whisper API (OpenAI)", "openai_api", "whisper-1"),
    ("Whisper large-v3 (auto-heberge)", "whisper_local", "large-v3"),
    ("Mistral Voxtral", "mistral_voxtral", "voxtral-mini-latest"),
]

_EXTENSIONS_AUDIO = {".mp3", ".wav", ".ogg", ".m4a"}

# Tarif approximatif Whisper API OpenAI (a verifier/actualiser sur
# https://openai.com/api/pricing -- facture a la minute, pas aux tokens).
_PRIX_USD_PAR_MINUTE_OPENAI = 0.006


class MockTranscriptionModel(BaseTranscriptionModel):
    def __init__(self, model_name: str):
        self.model_name = model_name

    def transcribe(self, audio_bytes: bytes, language_hint: Optional[str] = "fr") -> TranscriptionResponse:
        simulated_latency_ms = random.uniform(500, 2000)
        time.sleep(0.01)
        metadata = CallMetadata(
            provider="mock", model_name=self.model_name, latency_ms=simulated_latency_ms,
            tokens_input=0, tokens_output=0, estimated_cost_eur=0.0,
        )
        return TranscriptionResponse(text="[MOCK] transcription simulee", metadata=metadata, detected_language="fr")


def build_model(provider: str, model_name: str, dry_run: bool) -> BaseTranscriptionModel:
    if dry_run:
        return MockTranscriptionModel(model_name)
    if provider == "openai_api":
        return OpenAITranscriptionModel(model_name)
    if provider == "whisper_local":
        return WhisperLocalTranscriptionModel(model_name)
    if provider == "mistral_voxtral":
        return MistralVoxtralTranscriptionModel(model_name)
    raise ValueError(f"Provider inconnu : {provider}")


def lister_audios(dossier: Path) -> list[Path]:
    fichiers = [p for p in dossier.iterdir() if p.suffix.lower() in _EXTENSIONS_AUDIO]
    return sorted(fichiers, key=lambda p: p.name)


def run_benchmark_vocal(
    audio_dir: Path,
    output_path: Path,
    dry_run: bool,
    only_provider: Optional[str] = None,
    limit: Optional[int] = None,
) -> None:
    audios = lister_audios(audio_dir)
    if limit:
        audios = audios[:limit]

    models_to_run = MODELS
    if only_provider:
        models_to_run = [m for m in MODELS if m[1] == only_provider]

    results = []
    mode_label = "MOCK (dry-run)" if dry_run else "REEL"
    print(f"=== Benchmark vocal -- mode {mode_label} ===")
    print(f"Audios : {len(audios)} (dossier: {audio_dir}) | Modeles : {len(models_to_run)}")
    print()

    for label, provider, model_name in models_to_run:
        print(f"--- Modele : {label} ({model_name}) ---")
        try:
            model = build_model(provider, model_name, dry_run)
        except ProviderCallError as e:
            print(f"  ERREUR d'initialisation, modele ignore : {e}")
            continue

        for audio_path in audios:
            try:
                audio_bytes = audio_path.read_bytes()
                response = model.transcribe(audio_bytes, language_hint="fr")

                duree_minutes = len(audio_bytes) / (128_000 / 8) / 60  # approximation grossiere
                if provider == "openai_api":
                    cost = _PRIX_USD_PAR_MINUTE_OPENAI * duree_minutes * 0.92
                elif provider == "mistral_voxtral":
                    cost = 0.003 * duree_minutes * 0.92
                else:
                    cost = 0.0

                results.append({
                    "model_label": label, "provider": provider, "model_name": model_name,
                    "nom_fichier": audio_path.name, "success": True,
                    "transcription": response.text,
                    "detected_language": response.detected_language,
                    "latency_ms": response.metadata.latency_ms,
                    "estimated_cost_eur": cost,
                    "error": None,
                })
                print(f"  {audio_path.name} : OK ({response.metadata.latency_ms:.0f} ms)")
            except (ProviderCallError, FileNotFoundError, OSError) as e:
                results.append({
                    "model_label": label, "provider": provider, "model_name": model_name,
                    "nom_fichier": audio_path.name, "success": False,
                    "transcription": None, "detected_language": None,
                    "latency_ms": None, "estimated_cost_eur": None, "error": str(e),
                })
                print(f"  {audio_path.name} : ECHEC ({e})")

            output_path.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
        print()

    print(f"Termine. {len(results)} resultats sauvegardes dans {output_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Benchmark vocal (Sous-tache 1).")
    parser.add_argument("--audio-dir", type=Path, default=Path("ressources_audio"))
    parser.add_argument("--output", type=Path, default=Path("benchmark_vocal_results.json"))
    parser.add_argument("--real", action="store_true")
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--provider", type=str, default=None, help="openai_api, whisper_local ou mistral_voxtral")
    args = parser.parse_args()

    run_benchmark_vocal(
        audio_dir=args.audio_dir, output_path=args.output,
        dry_run=not args.real, only_provider=args.provider, limit=args.limit,
    )