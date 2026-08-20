"""
generer_recap_vocal.py — Sous-tache "comparatif" (Tache Vocal, Phase 1).

Genere un CSV recapitulatif par modele : score_exactitude_factuelle (0-5,
SUBSTITUT AU WER -- voir avertissement ci-dessous), latency_p50/p95,
cout_total/moyen.

AVERTISSEMENT IMPORTANT : la colonne demandee par la tache est "WER_moyen"
(Word Error Rate). Ce script ne calcule PAS de vrai WER -- les 15
transcriptions manuelles de reference verbatim necessaires pour ca ne sont
pas disponibles. A la place, "score_exactitude_factuelle_0_5" mesure si des
faits verifiables (ville, nom client, surface, specs techniques) sont
retrouves dans la transcription -- une mesure differente, plus faible
qu'un vrai WER, a documenter comme telle dans tout rapport ou tableau final.
"""

from __future__ import annotations

import argparse
import csv
import json
import statistics
from collections import defaultdict
from pathlib import Path


def percentile(values: list[float], p: float) -> float:
    if not values:
        return float("nan")
    values_sorted = sorted(values)
    k = (len(values_sorted) - 1) * (p / 100)
    f = int(k)
    c = min(f + 1, len(values_sorted) - 1)
    if f == c:
        return values_sorted[f]
    return values_sorted[f] + (values_sorted[c] - values_sorted[f]) * (k - f)


def score_exactitude_fichier(verification: dict) -> tuple[int, int]:
    """Retourne (nb_correct, nb_total) sur les criteres realisables pour ce fichier."""
    correct, total = 0, 0
    if "ville_correcte" in verification:
        total += 1
        correct += int(verification["ville_correcte"])
    if "nom_client_correct" in verification:
        total += 1
        correct += int(verification["nom_client_correct"])
    if "surface_correcte" in verification:
        total += 1
        correct += int(verification["surface_correcte"])
    if "nb_specs_totales" in verification and verification["nb_specs_totales"] > 0:
        total += verification["nb_specs_totales"]
        correct += verification["nb_specs_trouvees"]
    return correct, total


def generer_recap(results_paths: list[Path], exactitude_path: Path, output_csv: Path) -> list[dict]:
    exactitude_data = json.loads(exactitude_path.read_text(encoding="utf-8"))
    exactitude_lookup = {
        (e["nom_fichier"], e["model_label"]): e["verification"] for e in exactitude_data
    }

    par_modele: dict[str, list[dict]] = defaultdict(list)
    for results_path in results_paths:
        data = json.loads(results_path.read_text(encoding="utf-8"))
        for r in data:
            if r.get("success"):
                par_modele[r["model_label"]].append(r)

    lignes = []
    for modele, appels in par_modele.items():
        latencies = [a["latency_ms"] for a in appels if a.get("latency_ms") is not None]
        couts = [a["estimated_cost_eur"] for a in appels if a.get("estimated_cost_eur") is not None]

        nb_correct_total, nb_total_total = 0, 0
        for a in appels:
            verification = exactitude_lookup.get((a["nom_fichier"], modele))
            if verification:
                correct, total = score_exactitude_fichier(verification)
                nb_correct_total += correct
                nb_total_total += total

        score_exactitude_0_5 = (
            round((nb_correct_total / nb_total_total) * 5, 2) if nb_total_total else None
        )

        lignes.append({
            "modele": modele,
            "nb_cas": len(appels),
            "score_exactitude_factuelle_0_5": score_exactitude_0_5,
            "nb_faits_verifies": nb_total_total,
            "latency_p50_ms": round(percentile(latencies, 50), 1) if latencies else None,
            "latency_p95_ms": round(percentile(latencies, 95), 1) if latencies else None,
            "cout_total_eur": round(sum(couts), 6) if couts else 0.0,
            "cout_moyen_par_appel_eur": round(statistics.mean(couts), 6) if couts else 0.0,
        })

    lignes.sort(key=lambda l: (l["score_exactitude_factuelle_0_5"] or 0), reverse=True)

    with output_csv.open("w", newline="", encoding="utf-8-sig") as f:
        fieldnames = list(lignes[0].keys()) if lignes else []
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(lignes)

    return lignes


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Tableau comparatif vocal.")
    parser.add_argument("--results", type=Path, nargs="+", required=True,
                         help="Fichiers benchmark_vocal_*.json (un ou plusieurs)")
    parser.add_argument("--exactitude", type=Path, default=Path("exactitude_factuelle.json"))
    parser.add_argument("--output", type=Path, default=Path("recap_modeles_vocal.csv"))
    args = parser.parse_args()

    lignes = generer_recap(args.results, args.exactitude, args.output)
    print(f"CSV genere : {args.output} ({len(lignes)} modele(s))")
    print()
    print("RAPPEL : score_exactitude_factuelle_0_5 n'est PAS un WER -- substitut")
    print("faute de transcriptions manuelles de reference verbatim.")
    print()
    for l in lignes:
        print(l)