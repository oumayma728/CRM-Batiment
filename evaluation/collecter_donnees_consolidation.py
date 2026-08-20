"""
collecter_donnees_consolidation.py — Rassemble les metriques de tous les
benchmarks (texte/vision/vocal, tous providers) en un JSON consolide unique,
base uniquement sur les fichiers reels deja generes sur ce poste.
"""

from __future__ import annotations

import json
import statistics
from pathlib import Path


def percentile(values, p):
    if not values:
        return None
    values_sorted = sorted(values)
    k = (len(values_sorted) - 1) * (p / 100)
    f, c = int(k), min(int(k) + 1, len(values_sorted) - 1)
    if f == c:
        return values_sorted[f]
    return values_sorted[f] + (values_sorted[c] - values_sorted[f]) * (k - f)


def charger_json(path):
    p = Path(path)
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else None


consolidation = {"texte": [], "vision": [], "vocal": []}

# --- TEXTE ---
for label, fichier_scoring, fichier_brut in [
    ("Mistral Small", "scoring_results_json.json", "benchmark_mistral_json.json"),
    ("Gemini 3.5 Flash", "scoring_gemini_texte.json", "benchmark_gemini_texte.json"),
]:
    scoring = charger_json(fichier_scoring)
    brut = charger_json(fichier_brut)
    if scoring is None or brut is None:
        print(f"[TEXTE] {label} : fichiers manquants, ignore")
        continue
    cas_scorables = [c for c in scoring["cas"] if c.get("scorable")]
    latencies = [r["latency_ms"] for r in brut if r.get("success")]
    couts = [r["estimated_cost_eur"] for r in brut if r.get("success")]
    consolidation["texte"].append({
        "modele": label,
        "nb_cas_reels": len(cas_scorables),
        "precision_moyenne": scoring["summary"]["note_metier_heuristique_moyenne"],
        "precision_max_possible": 4,  # sur 4 depuis retrait coherence_type_prestation
        "json_moyen": scoring["summary"]["taux_parsabilite_json_moyen"],
        "latency_p50_ms": percentile(latencies, 50),
        "cout_moyen_eur": statistics.mean(couts) if couts else None,
    })

# --- VISION ---
scoring_vision = charger_json("scoring_vision_results.json")
if scoring_vision:
    cas_mistral = [c for c in scoring_vision["cas"] if c.get("scorable")]
    consolidation["vision"].append({
        "modele": "Mistral Pixtral",
        "nb_cas_reels": len(cas_mistral),
        "precision_moyenne": scoring_vision["summary"]["note_pertinence_materiaux_moyenne"],  # a defaut de mieux
        "precision_max_possible": 5,
        "json_moyen": scoring_vision["summary"]["taux_parsabilite_json_moyen"],
        "latency_p50_ms": None,  # a completer depuis recap_modeles_vision.csv si besoin
        "cout_moyen_eur": None,
    })
print("[VISION] Gemini : 1 seul cas manuel, jamais sauvegarde dans un fichier -- a ajouter a la main.")

# --- VOCAL ---
for label, fichier in [("Mistral Voxtral", "benchmark_vocal_voxtral.json"), ("Whisper local", "benchmark_vocal_local.json")]:
    brut = charger_json(fichier)
    if brut is None:
        continue
    latencies = [r["latency_ms"] for r in brut if r.get("success")]
    couts = [r["estimated_cost_eur"] for r in brut if r.get("success")]
    consolidation["vocal"].append({
        "modele": label,
        "nb_cas_reels": sum(1 for r in brut if r.get("success")),
        "latency_p50_ms": percentile(latencies, 50),
        "cout_moyen_eur": statistics.mean(couts) if couts else None,
    })
print("[VOCAL] Gemini : 1 seul cas manuel, jamais sauvegarde -- a ajouter a la main.")

Path("consolidation_brute.json").write_text(json.dumps(consolidation, ensure_ascii=False, indent=2), encoding="utf-8")
print()
print(json.dumps(consolidation, ensure_ascii=False, indent=2))