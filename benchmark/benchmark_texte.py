"""
benchmark_texte.py — Benchmark des modeles texte pour le module Devis IA.

Itere sur les cas de test (CSV), appelle chaque modele avec un prompt
systeme standardise, et sauvegarde toutes les sorties brutes en JSON
pour analyse ulterieure (precision metier notee manuellement, qualite
JSON, latence p50/p95, cout reel -- cf. cahier des charges section 3.2.2).
"""

from __future__ import annotations
from toolregistry.gemini_adapter import GeminiTextModel
import argparse
import json
import random
import time
from pathlib import Path
import pandas as pd
from toolregistry.mistral_adapter import MistralTextModel
from toolregistry.base import BaseTextModel, CallMetadata, TextGenerationResponse, ProviderCallError
from toolregistry.openai_adapter import OpenAITextModel
from toolregistry.anthropic_adapter import AnthropicTextModel


# Prompt systeme standardise (prompt engineering basique pour cette
# premiere passe de benchmark -- le few-shot et le catalogue en cache
# viendront en Phase 1 P1, section 4.2 du cahier des charges).
SYSTEM_PROMPT = """Tu es un expert en devis BTP (batiment et travaux publics).
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

# Les modeles couverts par notre ToolRegistry actuel (Gemini exclu :
# pas d'adaptateur construit pour l'instant). Noms exacts du cahier des
# charges pour Claude -- Sonnet 3.7 / Haiku 3.5 sont probablement
# deprecies aujourd'hui, a verifier avant un vrai run en production.
MODELS = [
    ("GPT-4o", "openai", "gpt-4o"),
    ("GPT-4o-mini", "openai", "gpt-4o-mini"),
    ("Claude Sonnet 3.7", "anthropic", "claude-3-7-sonnet-20250219"),
    ("Claude Haiku 3.5", "anthropic", "claude-3-5-haiku-20241022"),
    ("Mistral Small", "mistral", "mistral-small-latest"),
    ("Gemini 3.5 Flash", "gemini", "gemini-3.5-flash"),
]


def load_cases(csv_path: Path) -> pd.DataFrame:
    """Charge les cas de test texte depuis le CSV."""
    df = pd.read_csv(csv_path)
    required_columns = {"id", "description"}
    missing = required_columns - set(df.columns)
    if missing:
        raise ValueError(f"Colonnes manquantes dans le CSV : {missing}")
    return df


class MockTextModel(BaseTextModel):
    """
    Adaptateur factice pour le mode dry-run (pas de credit API disponible
    actuellement). Implemente le meme contrat BaseTextModel que les vrais
    adaptateurs -- le reste du script ne sait pas qu'il manipule un mock.
    """

    def __init__(self, model_name: str):
        self.model_name = model_name

    def generate(
        self,
        prompt: str,
        system_prompt: str | None = None,
        max_tokens: int = 1000,
        temperature: float = 0.2,
    ) -> TextGenerationResponse:
        # Latence simulee variable, pour que les stats p50/p95 calculees
        # plus tard sur un vrai run aient un equivalent plausible en mock.
        simulated_latency_ms = random.uniform(300, 1500)
        time.sleep(0.01)  # micro-pause reelle, juste pour eviter latency_ms=0 exact

        fake_content = (
            f"[MOCK-{self.model_name}] Devis simule pour : {prompt[:80]}... "
            f"Prestations : a definir. Materiaux : a definir. Quantites : a definir."
        )
        tokens_input = max(len(prompt.split()) * 2, 10)
        tokens_output = 60

        metadata = CallMetadata(
            provider="mock",
            model_name=self.model_name,
            latency_ms=simulated_latency_ms,
            tokens_input=tokens_input,
            tokens_output=tokens_output,
            estimated_cost_eur=0.0,
        )
        return TextGenerationResponse(content=fake_content, metadata=metadata)


def build_model(provider: str, model_name: str, dry_run: bool) -> BaseTextModel:
    """Instancie le bon adaptateur (reel ou mock) selon le mode d'execution."""
    if dry_run:
        return MockTextModel(model_name)
    if provider == "openai":
        return OpenAITextModel(model_name)
    if provider == "anthropic":
        return AnthropicTextModel(model_name)
    if provider == "mistral":
        return MistralTextModel(model_name)
    if provider == "gemini":
        return GeminiTextModel(model_name)
    raise ValueError(f"Provider inconnu : {provider}")


def run_benchmark(
    csv_path: Path,
    output_path: Path,
    dry_run: bool,
    only_provider: str | None = None,
    limit: int | None = None,
) -> None:
    df = load_cases(csv_path)
    if limit:
        df = df.head(limit)

    models_to_run = MODELS
    if only_provider:
        models_to_run = [m for m in MODELS if m[1] == only_provider]

    results = []

    mode_label = "MOCK (dry-run)" if dry_run else "REEL (appels payants)"
    print(f"=== Benchmark texte -- mode {mode_label} ===")
    print(f"Cas de test : {len(df)} | Modeles : {len(models_to_run)}")
    print()

    for label, provider, model_name in models_to_run:
        print(f"--- Modele : {label} ({model_name}) ---")
        try:
            model = build_model(provider, model_name, dry_run)
        except ProviderCallError as e:
            print(f"  ERREUR d'initialisation, modele ignore : {e}")
            continue

        for _, case in df.iterrows():
            case_id = case["id"]
            description = case["description"]

            try:
                response = model.generate(
                    prompt=description,
                    system_prompt=SYSTEM_PROMPT,
                    max_tokens=800,
                )
                results.append({
                    "model_label": label,
                    "provider": provider,
                    "model_name": model_name,
                    "case_id": case_id,
                    "success": True,
                    "content": response.content,
                    "latency_ms": response.metadata.latency_ms,
                    "tokens_input": response.metadata.tokens_input,
                    "tokens_output": response.metadata.tokens_output,
                    "estimated_cost_eur": response.metadata.estimated_cost_eur,
                    "error": None,
                })
                print(f"  {case_id} : OK ({response.metadata.latency_ms:.0f} ms)")
            except ProviderCallError as e:
                results.append({
                    "model_label": label,
                    "provider": provider,
                    "model_name": model_name,
                    "case_id": case_id,
                    "success": False,
                    "content": None,
                    "latency_ms": None,
                    "tokens_input": None,
                    "tokens_output": None,
                    "estimated_cost_eur": None,
                    "error": str(e),
                })
                print(f"  {case_id} : ECHEC ({e})")

            # Sauvegarde apres CHAQUE cas : si le script plante en cours
            # de route (reseau, quota), on ne perd pas les appels deja
            # effectues (et potentiellement payes).
            output_path.write_text(
                json.dumps(results, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )

        print()

    print(f"Termine. {len(results)} resultats sauvegardes dans {output_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Benchmark des modeles texte pour le module Devis IA.")
    parser.add_argument("--csv", type=Path, default=Path("devis_texte_benchmark.csv"), help="Chemin vers le CSV des cas de test.")
    parser.add_argument("--output", type=Path, default=Path("benchmark_texte_results.json"), help="Chemin du fichier JSON de sortie.")
    parser.add_argument("--real", action="store_true", help="Effectue de vrais appels API payants (par defaut : mode mock/dry-run).")
    parser.add_argument("--limit", type=int, default=None, help="Limite le nombre de cas testes (pour un run rapide).")
    parser.add_argument("--provider", type=str, default=None, help="Ne teste qu'un seul provider (openai, anthropic, mistral).")
    args = parser.parse_args()

    run_benchmark(
        csv_path=args.csv,
        output_path=args.output,
        dry_run=not args.real,
        only_provider=args.provider,
        limit=args.limit,
    )