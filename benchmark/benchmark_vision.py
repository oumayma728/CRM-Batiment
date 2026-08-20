"""
benchmark_vision.py — Benchmark des modeles vision pour le module Devis IA.

Sous-tache : charge les photos depuis un dossier, appelle chaque modele
vision (GPT-4o, Claude Sonnet 3.7) avec un prompt standardise demandant
type_piece, surface_estimee_m2, materiaux_identifies, reference_visible_oui_non.

Gemini 2.0 Flash absent (pas d'adaptateur/acces -- documente, pas un bug).
"""

from __future__ import annotations
import re
import argparse
import json
import random
import time
from pathlib import Path
from typing import Optional
from toolregistry.mistral_adapter import MistralVisionModel
from toolregistry.base import BaseVisionModel, CallMetadata, VisionAnalysisResponse, ProviderCallError
from toolregistry.openai_adapter import OpenAIVisionModel
from toolregistry.anthropic_adapter import AnthropicVisionModel


SYSTEM_PROMPT = """Tu es un expert en analyse de photos de chantier BTP (batiment
et travaux publics). A partir de la photo fournie, identifie les elements
utiles a la generation d'un devis. Reponds UNIQUEMENT en JSON avec exactement
ces cles :
{
  "type_piece": "...",
  "surface_estimee_m2": ...,
  "materiaux_identifies": ["...", "..."],
  "reference_visible_oui_non": "oui" ou "non"
}
Si un element ne peut pas etre determine avec confiance (photo floue, cadrage
insuffisant, sujet masque), indique-le explicitement dans le champ concerne
plutot que d'inventer une valeur."""

MODELS = [
    ("GPT-4o Vision", "openai", "gpt-4o"),
    ("Claude Sonnet 3.7 Vision", "anthropic", "claude-3-7-sonnet-20250219"),
    ("Mistral Pixtral", "mistral", "pixtral-12b-2409"),
]

_EXTENSIONS_IMAGES = {".jpg", ".jpeg", ".png"}


class MockVisionModel(BaseVisionModel):
    """Adaptateur factice pour mode dry-run, meme contrat que les vrais adaptateurs."""

    def __init__(self, model_name: str):
        self.model_name = model_name

    def analyze_image(
        self,
        image_bytes: bytes,
        prompt: str,
        system_prompt: Optional[str] = None,
        max_tokens: int = 1000,
    ) -> VisionAnalysisResponse:
        simulated_latency_ms = random.uniform(800, 3000)
        time.sleep(0.01)

        fake_content = json.dumps({
            "type_piece": "MOCK - a determiner",
            "surface_estimee_m2": None,
            "materiaux_identifies": ["mock"],
            "reference_visible_oui_non": "non",
        }, ensure_ascii=False)

        metadata = CallMetadata(
            provider="mock",
            model_name=self.model_name,
            latency_ms=simulated_latency_ms,
            tokens_input=max(len(image_bytes) // 750, 50),
            tokens_output=40,
            estimated_cost_eur=0.0,
        )
        return VisionAnalysisResponse(content=fake_content, metadata=metadata)


def build_model(provider: str, model_name: str, dry_run: bool) -> BaseVisionModel:
    if dry_run:
        return MockVisionModel(model_name)
    if provider == "openai":
        return OpenAIVisionModel(model_name)
    if provider == "anthropic":
        return AnthropicVisionModel(model_name)
    if provider == "mistral":
            return MistralVisionModel(model_name)
    raise ValueError(f"Provider inconnu : {provider}")
    


def lister_photos(dossier: Path) -> list[Path]:
    """Liste toutes les images du dossier (tri par nom pour un ordre stable)."""
    fichiers = [
        p for p in dossier.iterdir()
        if p.suffix.lower() in _EXTENSIONS_IMAGES
    ]
    return sorted(fichiers, key=lambda p: p.name)


def run_benchmark_vision(
    photos_dir: Path,
    output_path: Path,
    dry_run: bool,
    only_provider: Optional[str] = None,
    limit: Optional[int] = None,
) -> None:
    photos = lister_photos(photos_dir)
    if limit:
        photos = photos[:limit]

    models_to_run = MODELS
    if only_provider:
        models_to_run = [m for m in MODELS if m[1] == only_provider]

    results = []

    mode_label = "MOCK (dry-run)" if dry_run else "REEL (appels payants)"
    print(f"=== Benchmark vision -- mode {mode_label} ===")
    print(f"Photos : {len(photos)} (dossier: {photos_dir}) | Modeles : {len(models_to_run)}")
    print()

    for label, provider, model_name in models_to_run:
        print(f"--- Modele : {label} ({model_name}) ---")
        try:
            model = build_model(provider, model_name, dry_run)
        except ProviderCallError as e:
            print(f"  ERREUR d'initialisation, modele ignore : {e}")
            continue

        for photo_path in photos:
            try:
                image_bytes = photo_path.read_bytes()

                response = model.analyze_image(
                    image_bytes=image_bytes,
                    prompt="Analyse cette photo de chantier selon les instructions.",
                    system_prompt=SYSTEM_PROMPT,
                    max_tokens=500,
                )

                tparsed = None
                json_valide = False
                try:
                    parsed = json.loads(response.content)
                    json_valide = True
                except (json.JSONDecodeError, ValueError):
                    match = re.search(r"```json\s*(.*?)```", response.content, re.DOTALL)
                    if match:
                        try:
                            parsed = json.loads(match.group(1).strip())
                            json_valide = True
                        except (json.JSONDecodeError, ValueError):
                            pass

                results.append({
                    "model_label": label,
                    "provider": provider,
                    "model_name": model_name,
                    "nom_fichier": photo_path.name,
                    "success": True,
                    "content": response.content,
                    "json_valide": json_valide,
                    "parsed": parsed,
                    "latency_ms": response.metadata.latency_ms,
                    "tokens_input": response.metadata.tokens_input,
                    "tokens_output": response.metadata.tokens_output,
                    "estimated_cost_eur": response.metadata.estimated_cost_eur,
                    "error": None,
                })
                print(f"  {photo_path.name} : OK ({response.metadata.latency_ms:.0f} ms, JSON valide={json_valide})")
            except (ProviderCallError, FileNotFoundError, OSError) as e:
                results.append({
                    "model_label": label,
                    "provider": provider,
                    "model_name": model_name,
                    "nom_fichier": photo_path.name,
                    "success": False,
                    "content": None,
                    "json_valide": False,
                    "parsed": None,
                    "latency_ms": None,
                    "tokens_input": None,
                    "tokens_output": None,
                    "estimated_cost_eur": None,
                    "error": str(e),
                })
                print(f"  {photo_path.name} : ECHEC ({e})")

            output_path.write_text(
                json.dumps(results, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )

        print()

    print(f"Termine. {len(results)} resultats sauvegardes dans {output_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Benchmark des modeles vision pour le module Devis IA.")
    parser.add_argument("--photos-dir", type=Path, default=Path("ressources"), help="Dossier contenant les photos.")
    parser.add_argument("--output", type=Path, default=Path("benchmark_vision_results.json"))
    parser.add_argument("--real", action="store_true", help="Appels API reels payants (sinon mock).")
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--provider", type=str, default=None, help="openai ou anthropic uniquement.")
    args = parser.parse_args()

    run_benchmark_vision(
        photos_dir=args.photos_dir,
        output_path=args.output,
        dry_run=not args.real,
        only_provider=args.provider,
        limit=args.limit,
    )