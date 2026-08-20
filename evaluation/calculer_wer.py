"""
calculer_wer.py — Sous-tache "exactitude" (Tache Vocal, Phase 1).

Calcule le Word Error Rate (WER) entre les transcriptions generees et deux
types de reference :
  1. "resume" = description_contexte du CSV audios_benchmark.csv (resume a
     la 3e personne, PAS une transcription verbatim).
  2. "reconstruit" = transcriptions.csv (texte reconstruit en style oral a
     partir des faits connus, plus proche de la structure d'une vraie
     transcription -- mais toujours PAS une transcription manuelle
     verifiee, puisque personne n'a ecoute l'audio pour la produire).

AVERTISSEMENT STRUCTUREL, A GARDER DANS TOUT RAPPORT :
Aucune des deux references n'est une vraie transcription manuelle verbatim.
Le WER "resume" est structurellement gonfle (souvent >100%, ce qui est
mathematiquement possible). Le WER "reconstruit" devrait etre plus bas et
plus lisible, mais reste approximatif : la reference reconstruite ne
connait pas l'adresse complete (rue + numero), absente de
description_contexte, ce qui gonflera artificiellement le WER sur cette
portion pour toute transcription qui, elle, mentionne l'adresse complete.
A lire en RELATIF entre modeles, jamais comme un WER de reference absolu.
"""

from __future__ import annotations

import argparse
import json
import re
import unicodedata
import statistics
from collections import defaultdict
from pathlib import Path

import pandas as pd


def _normaliser(texte: str) -> str:
    """Minuscule, sans accents, ponctuation retiree -- pour un WER qui ne
    penalise pas des differences purement orthographiques triviales."""
    decompose = unicodedata.normalize("NFD", str(texte))
    sans_accents = "".join(c for c in decompose if unicodedata.category(c) != "Mn")
    sans_ponctuation = re.sub(r"[^\w\s]", " ", sans_accents.lower())
    return re.sub(r"\s+", " ", sans_ponctuation).strip()


def wer(reference: str, hypothese: str) -> dict:
    """
    Calcule le WER par distance d'edition au niveau mot (substitutions,
    insertions, suppressions), normalise par le nombre de mots de reference.
    """
    ref_mots = _normaliser(reference).split()
    hyp_mots = _normaliser(hypothese).split()
    n, m = len(ref_mots), len(hyp_mots)

    if n == 0:
        return {"wer": None, "raison": "reference vide"}

    d = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n + 1):
        d[i][0] = i
    for j in range(m + 1):
        d[0][j] = j
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            cout_sub = 0 if ref_mots[i - 1] == hyp_mots[j - 1] else 1
            d[i][j] = min(
                d[i - 1][j] + 1,             # suppression
                d[i][j - 1] + 1,             # insertion
                d[i - 1][j - 1] + cout_sub,  # substitution ou match
            )

    distance = d[n][m]
    return {
        "wer": round(distance / n, 4),
        "distance_edition": distance,
        "nb_mots_reference": n,
        "nb_mots_hypothese": m,
    }


def run_calcul_wer(
    csv_path: Path,
    csv_reconstruit_path: Path,
    results_paths: list[Path],
    output_path: Path,
) -> None:
    df = pd.read_csv(csv_path, encoding="utf-8-sig")
    references_resume = dict(zip(df["nom_fichier"], df["description_contexte"]))

    df_reconstruit = pd.read_csv(csv_reconstruit_path, encoding="utf-8-sig")
    references_reconstruites = dict(
        zip(df_reconstruit["nom_fichier"], df_reconstruit["transcription_reconstruite_reference"])
    )

    resultats = []
    for results_path in results_paths:
        data = json.loads(results_path.read_text(encoding="utf-8"))
        for r in data:
            if not r.get("success"):
                continue

            reference_resume = references_resume.get(r["nom_fichier"])
            reference_reconstruite = references_reconstruites.get(r["nom_fichier"])

            score_resume = wer(reference_resume, r["transcription"]) if reference_resume else {"wer": None}
            score_reconstruit = wer(reference_reconstruite, r["transcription"]) if reference_reconstruite else {"wer": None}

            resultats.append({
                "nom_fichier": r["nom_fichier"],
                "model_label": r["model_label"],
                "wer_vs_resume": score_resume.get("wer"),
                "wer_vs_reconstruit": score_reconstruit.get("wer"),
            })

    output_path.write_text(json.dumps(resultats, ensure_ascii=False, indent=2), encoding="utf-8")

    par_modele = defaultdict(lambda: {"resume": [], "reconstruit": []})
    for r in resultats:
        if r["wer_vs_resume"] is not None:
            par_modele[r["model_label"]]["resume"].append(r["wer_vs_resume"])
        if r["wer_vs_reconstruit"] is not None:
            par_modele[r["model_label"]]["reconstruit"].append(r["wer_vs_reconstruit"])

    print(f"WER calcule pour {len(resultats)} transcriptions -> {output_path}")
    print()
    print("RAPPEL : ni 'resume' ni 'reconstruit' ne sont des transcriptions manuelles")
    print("verifiees. A lire en RELATIF entre modeles, jamais en valeur absolue.")
    print()
    for modele, scores in par_modele.items():
        print(f"{modele} :")
        if scores["resume"]:
            print(f"  WER vs resume brut            : {statistics.mean(scores['resume']):.2%} (n={len(scores['resume'])})")
        else:
            print("  WER vs resume brut            : N/A")
        if scores["reconstruit"]:
            print(f"  WER vs reference reconstruite : {statistics.mean(scores['reconstruit']):.2%} (n={len(scores['reconstruit'])})")
        else:
            print("  WER vs reference reconstruite : N/A")
        print()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Calcul du WER (deux references comparees : resume brut et reconstruit).")
    parser.add_argument("--csv", type=Path, default=Path("audios_benchmark.csv"), help="CSV avec description_contexte.")
    parser.add_argument("--csv-reconstruit", type=Path, default=Path("transcriptions.csv"), help="CSV avec transcription_reconstruite_reference.")
    parser.add_argument("--results", type=Path, nargs="+", required=True, help="Fichiers benchmark_vocal_*.json")
    parser.add_argument("--output", type=Path, default=Path("wer_results.json"))
    args = parser.parse_args()

    run_calcul_wer(args.csv, args.csv_reconstruit, args.results, args.output)