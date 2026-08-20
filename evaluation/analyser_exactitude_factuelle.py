"""
analyser_exactitude_factuelle.py — Sous-tache "exactitude" (Tache Vocal),
version alternative faute de transcriptions manuelles verbatim.

Principe : extraire les faits verifiables de description_contexte (CSV
audios_benchmark.csv) -- surface, ville, nom client, specs techniques --
et verifier s'ils apparaissent correctement dans chaque transcription
generee. Ce n'est PAS un WER (Word Error Rate) au sens strict : ca mesure
la fidelite factuelle, pas la fidelite mot-a-mot. A documenter comme tel
dans le rapport -- le vrai WER reste a faire une fois les 15 transcriptions
manuelles verbatim disponibles.

Extraction de faits verifiee manuellement sur les 15 lignes reelles avant
integration ici (voir echanges de conversation) -- corrige pour gerer les
noms composes avec particule (ex: "Maxime De Raedt") et les noms sans
prenom (ex: "M. Martin").
"""

from __future__ import annotations

import argparse
import json
import re
import unicodedata
from collections import defaultdict
from pathlib import Path

import pandas as pd

_VILLES_CONNUES = ["namur", "liege", "bruxelles", "mons"]  # a completer si d'autres villes apparaissent


def _normaliser(texte: str) -> str:
    decompose = unicodedata.normalize("NFD", str(texte))
    return "".join(c for c in decompose if unicodedata.category(c) != "Mn").lower()


# 1. Extraction des faits verifiables depuis description_contexte

def extraire_faits(description: str) -> dict:
    faits = {}

    match_surface = re.search(r"(\d+(?:[.,]\d+)?)\s*m[²2]", description)
    if match_surface:
        faits["surface_m2"] = match_surface.group(1)

    desc_norm = _normaliser(description)
    for ville in _VILLES_CONNUES:
        if ville in desc_norm:
            faits["ville"] = ville
            break

    # Nom client : capture tous les mots capitalises entre "M./Mme" et la
    # parenthese qui suit toujours dans ce CSV -- gere les noms composes
    # avec particule (ex: "Maxime De Raedt") et les noms sans prenom
    # (ex: "M. Martin"), verifie sur les 15 cas reels.
    match_nom = re.search(
        r"M(?:me|\.)?\s+([A-ZÀ-Ý][A-Za-zà-ÿ]+(?:\s+[A-ZÀ-Ý][A-Za-zà-ÿ]+)*)\s*\(",
        description,
    )
    if match_nom:
        faits["nom_client"] = match_nom.group(1).strip()

    specs = re.findall(r"(\d+(?:[.,]\d+)?)\s*(kwc|kwh|kw|cm|mm)", desc_norm)
    if specs:
        faits["specs_techniques"] = [f"{valeur}{unite}" for valeur, unite in specs]

    return faits


# 2. Verification des faits dans une transcription

def verifier_faits(faits: dict, transcription: str) -> dict:
    texte_norm = _normaliser(transcription)
    resultat = {}

    if "surface_m2" in faits:
        pattern = rf"\b{re.escape(faits['surface_m2'])}\s*(m[²2]|metres?\s+carres?)"
        resultat["surface_correcte"] = bool(re.search(pattern, texte_norm))

    if "ville" in faits:
        resultat["ville_correcte"] = faits["ville"] in texte_norm

    if "nom_client" in faits:
        # Au moins un des mots du nom (hors particules courtes type "De")
        # doit apparaitre -- un nom complet mal transcrit dans le detail
        # (accent, orthographe) reste utile a signaler mais ne doit pas
        # compter comme un echec total si le nom de famille principal est present.
        mots_nom = [m for m in faits["nom_client"].split() if len(m) > 2]
        nom_norm = [_normaliser(m) for m in mots_nom]
        mots_trouves = [m for m in nom_norm if m in texte_norm]
        resultat["nom_client_mots_trouves"] = len(mots_trouves)
        resultat["nom_client_mots_totaux"] = len(nom_norm)
        resultat["nom_client_correct"] = len(mots_trouves) == len(nom_norm)

    if "specs_techniques" in faits:
        specs_trouvees = []
        for spec in faits["specs_techniques"]:
            valeur = re.match(r"[\d.,]+", spec).group()
            if valeur.replace(",", ".") in texte_norm.replace(",", "."):
                specs_trouvees.append(spec)
        resultat["specs_trouvees"] = specs_trouvees
        resultat["nb_specs_totales"] = len(faits["specs_techniques"])
        resultat["nb_specs_trouvees"] = len(specs_trouvees)

    return resultat


# Orchestration

def run_analyse(csv_path: Path, results_paths: list[Path], output_path: Path) -> None:
    df = pd.read_csv(csv_path, encoding="utf-8-sig")
    faits_par_fichier = {
        row["nom_fichier"]: extraire_faits(row["description_contexte"])
        for _, row in df.iterrows()
    }

    analyse = []
    for results_path in results_paths:
        data = json.loads(results_path.read_text(encoding="utf-8"))
        for r in data:
            if not r.get("success"):
                continue
            faits = faits_par_fichier.get(r["nom_fichier"], {})
            verification = verifier_faits(faits, r["transcription"])
            analyse.append({
                "nom_fichier": r["nom_fichier"],
                "model_label": r["model_label"],
                "faits_reference": faits,
                "verification": verification,
            })

    output_path.write_text(json.dumps(analyse, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Analyse terminee : {len(analyse)} lignes -> {output_path}")
    print()

    stats = defaultdict(lambda: {"ville_ok": 0, "ville_total": 0, "nom_ok": 0, "nom_total": 0,
                                   "surface_ok": 0, "surface_total": 0,
                                   "specs_trouvees": 0, "specs_totales": 0})
    for a in analyse:
        s = stats[a["model_label"]]
        v = a["verification"]
        if "ville_correcte" in v:
            s["ville_total"] += 1
            s["ville_ok"] += int(v["ville_correcte"])
        if "nom_client_correct" in v:
            s["nom_total"] += 1
            s["nom_ok"] += int(v["nom_client_correct"])
        if "surface_correcte" in v:
            s["surface_total"] += 1
            s["surface_ok"] += int(v["surface_correcte"])
        if "nb_specs_totales" in v:
            s["specs_totales"] += v["nb_specs_totales"]
            s["specs_trouvees"] += v["nb_specs_trouvees"]

    for modele, s in stats.items():
        print(f"{modele} :")
        print(f"  ville      : {s['ville_ok']}/{s['ville_total']}")
        print(f"  nom client : {s['nom_ok']}/{s['nom_total']}")
        print(f"  surface    : {s['surface_ok']}/{s['surface_total']}")
        print(f"  specs      : {s['specs_trouvees']}/{s['specs_totales']}")
        print()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Analyse d'exactitude factuelle (alternative au WER).")
    parser.add_argument("--csv", type=Path, default=Path("audios_benchmark.csv"))
    parser.add_argument("--results", type=Path, nargs="+", required=True,
                         help="Un ou plusieurs fichiers benchmark_vocal_*.json")
    parser.add_argument("--output", type=Path, default=Path("exactitude_factuelle.json"))
    args = parser.parse_args()

    run_analyse(args.csv, args.results, args.output)