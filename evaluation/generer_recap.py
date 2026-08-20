"""
generer_recap.py — Sous-tache 3 (Tache 1, Phase 1) : CSV recapitulatif
modele x criteres, et identification des meilleurs modeles.

Genere un CSV avec, pour chaque modele teste :
- nb_cas, score_metier_moyen (0-5), taux_parsabilite_json (0-1),
  latency_p50_ms, latency_p95_ms, cout_total_eur, cout_moyen_par_appel_eur

IMPORTANT : a ce stade, seul Mistral Small a des donnees reelles scorees
(scoring_results.json). OpenAI/Anthropic restent en mock (pas de credits)
et ne sont PAS inclus ici -- les inclure donnerait un classement trompeur
base sur des donnees simulees. Le "top 3" demande par la Sous-tache 3 ne
peut donc pas etre produit tant qu'un seul modele a des donnees reelles ;
ce script le documente explicitement plutot que de fabriquer un classement
a partir de donnees partielles.
"""

from __future__ import annotations

import argparse
import csv
import json
import statistics
from pathlib import Path


def percentile(values: list[float], p: float) -> float:
    """Percentile par interpolation lineaire (methode standard, coherente
    avec p50/p95 tel que mesure dans benchmark_texte.py)."""
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
    cas = [c for c in data["cas"] if c.get("scorable")]

    par_modele: dict[str, list[dict]] = {}
    for c in cas:
        par_modele.setdefault(c["model_label"], []).append(c)

    lignes = []
    for modele, cas_modele in par_modele.items():
        scores_metier = [c["note_metier_heuristique_0_5"] for c in cas_modele]
        scores_json = [c["json_parsability_score"] for c in cas_modele]
        latencies = [c["latency_ms"] for c in cas_modele if c["latency_ms"] is not None]
        couts = [c["estimated_cost_eur"] for c in cas_modele if c["estimated_cost_eur"] is not None]

        lignes.append({
            "modele": modele,
            "nb_cas": len(cas_modele),
            "score_metier_moyen_0_5": round(statistics.mean(scores_metier), 3),
            "taux_parsabilite_json": round(statistics.mean(scores_json), 3),
            "latency_p50_ms": round(percentile(latencies, 50), 1),
            "latency_p95_ms": round(percentile(latencies, 95), 1),
            "cout_total_eur": round(sum(couts), 6),
            "cout_moyen_par_appel_eur": round(statistics.mean(couts), 6),
        })

    lignes.sort(key=lambda l: l["score_metier_moyen_0_5"], reverse=True)

    with output_csv.open("w", newline="", encoding="utf-8") as f:
        fieldnames = list(lignes[0].keys()) if lignes else []
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(lignes)

    return lignes


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Genere le CSV recapitulatif modele x criteres.")
    parser.add_argument("--scoring", type=Path, default=Path("scoring_results.json"))
    parser.add_argument("--output", type=Path, default=Path("recap_modeles.csv"))
    args = parser.parse_args()

    lignes = generer_recap(args.scoring, args.output)

    print(f"CSV genere : {args.output} ({len(lignes)} modele(s))")
    print()
    if len(lignes) < 3:
        print(
            f"ATTENTION : seul(s) {len(lignes)} modele(s) ont des donnees reelles scorees. "
            "Impossible d'identifier un 'top 3' significatif -- OpenAI/Anthropic/Gemini "
            "restent en mock ou non testes."
        )
        print()
    print("Classement disponible (par score metier heuristique decroissant) :")
    for i, ligne in enumerate(lignes, start=1):
        print(
            f"  {i}. {ligne['modele']} -- score {ligne['score_metier_moyen_0_5']}/5, "
            f"JSON {ligne['taux_parsabilite_json']*100:.0f}%, "
            f"p50 {ligne['latency_p50_ms']}ms, p95 {ligne['latency_p95_ms']}ms, "
            f"cout moyen {ligne['cout_moyen_par_appel_eur']*1000:.4f} m€/appel"
        )