"""
generer_recap_vision.py — Sous-tache 3 (partie 2) : tableau comparatif
vision (modele x criteres).

IMPORTANT : score_precision_surface est calcule UNIQUEMENT sur les cas ou
l'ecart de surface est mesurable (cf. limite documentee : 10/44 photos max
ont une reference chiffree). Le nombre de cas utilises est toujours inclus
dans la sortie pour eviter de presenter une moyenne comme plus robuste
qu'elle ne l'est.

Formule : score_precision_surface (0-5) = 5 - min(ecart_pct_moyen / 20, 5)
-> 0% d'ecart = 5/5, 100%+ d'ecart = 0/5. Choix assume, ajustable.
"""

from __future__ import annotations

import argparse
import csv
import json
import statistics
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


def generer_recap(scoring_path: Path, output_csv: Path) -> list[dict]:
    data = json.loads(scoring_path.read_text(encoding="utf-8"))
    cas = [c for c in data["cas"] if c["scorable"]]

    par_modele: dict[str, list[dict]] = {}
    for c in cas:
        par_modele.setdefault(c["model_label"], []).append(c)

    lignes = []
    for modele, cas_modele in par_modele.items():
        avec_ecart = [c for c in cas_modele if c["ecart_surface_pct"] is not None]
        ecart_moyen = statistics.mean([c["ecart_surface_pct"] for c in avec_ecart]) if avec_ecart else None
        score_precision_surface = round(5 - min(ecart_moyen / 20, 5), 2) if ecart_moyen is not None else None

        notes_materiaux = [c["note_pertinence_materiaux_0_5"] for c in cas_modele]
        latencies = [c["latency_ms"] for c in cas_modele if c["latency_ms"] is not None]
        couts = [c["estimated_cost_eur"] for c in cas_modele if c["estimated_cost_eur"] is not None]

        lignes.append({
            "modele": modele,
            "nb_cas": len(cas_modele),
            "score_precision_surface_0_5": score_precision_surface,
            "nb_cas_surface_comparable": len(avec_ecart),
            "score_materials_0_5": round(statistics.mean(notes_materiaux), 2),
            "latency_p50_ms": round(percentile(latencies, 50), 1),
            "latency_p95_ms": round(percentile(latencies, 95), 1),
            "cout_total_eur": round(sum(couts), 6),
            "cout_moyen_par_appel_eur": round(statistics.mean(couts), 6) if couts else None,
        })

    with output_csv.open("w", newline="", encoding="utf-8-sig") as f:
        fieldnames = list(lignes[0].keys()) if lignes else []
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(lignes)

    return lignes


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Tableau comparatif vision (Sous-tache 3).")
    parser.add_argument("--scoring", type=Path, default=Path("scoring_vision_results.json"))
    parser.add_argument("--output", type=Path, default=Path("recap_modeles_vision.csv"))
    args = parser.parse_args()

    lignes = generer_recap(args.scoring, args.output)
    print(f"CSV genere : {args.output} ({len(lignes)} modele(s))")
    if len(lignes) < 2:
        print("RAPPEL : un seul modele a des donnees reelles (Mistral) -- pas de vraie comparaison inter-modeles possible pour l'instant.")
    for l in lignes:
        print(l)