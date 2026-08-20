"""
scoring_vision.py — Sous-tache 2 (Tache Vision, Phase 1) : validation des
reponses vision.

- Parsabilite JSON (0-1), reprend la logique de benchmark_vision.py
  (extraction d'un bloc ```json ... ``` si json.loads() direct echoue).
- Comparaison surface_estimee_m2 (modele) vs surface_approx_m2 (CSV
  metadonnees reel) : ecart % calcule UNIQUEMENT quand les deux valeurs
  sont extractibles en nombre. Les cas REJETE_* (ou surface non chiffrable
  cote modele/reference) sont documentes comme "non_comparable", jamais
  forces a un chiffre invente.
- Pertinence materiaux (0-5) : chevauchement heuristique entre
  materiaux_identifies (modele) et elements_visibles (reference CSV).
  PAS une validation expert -- meme logique de prudence que
  scoring_texte.py (note_est_une_validation_expert: false).
"""

from __future__ import annotations

import argparse
import json
import re
import unicodedata
from pathlib import Path
from typing import Optional

import pandas as pd


# 1. Parsabilite JSON (reprend le correctif deja applique dans benchmark_vision.py)

def parser_json_reponse(content: str) -> tuple[Optional[dict], bool, str]:
    """Retourne (objet_parse, json_valide, methode)."""
    if not content:
        return None, False, "aucune"
    try:
        return json.loads(content), True, "direct"
    except (json.JSONDecodeError, ValueError):
        pass

    match = re.search(r"```json\s*(.*?)```", content, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1).strip()), True, "bloc_json_fence"
        except (json.JSONDecodeError, ValueError):
            pass

    return None, False, "aucune"


# 2. Extraction numerique tolerante (surfaces reference ET generees)

_NOMBRE = r"\d+(?:[.,]\d+)?"


def extraire_surface_numerique(valeur) -> tuple[Optional[float], str]:
    """
    Tente d'extraire un nombre representatif d'une valeur de surface,
    qu'elle vienne du CSV de reference ou de la reponse du modele.
    Retourne (valeur_numerique_ou_None, raison_si_non_extractible).

    Gere :
    - nombre direct (int/float) -> utilise tel quel
    - plage "14-18", "12-16" (tiret normal ou cadratin) -> milieu de la plage
    - texte libre contenant un ou plusieurs nombres (ex: "environ 120 m²
      (estimation...)") -> moyenne des nombres trouves
    - objet imbrique (dict, ex: plusieurs sous-surfaces) -> non extractible,
      signale comme ecart de schema, pas comme echec silencieux
    - texte sans aucun nombre (ex: "impossible a determiner", "Exterieur")
      -> non extractible, raison explicite
    """
    if valeur is None:
        return None, "valeur absente"

    if isinstance(valeur, (int, float)):
        return float(valeur), ""

    if isinstance(valeur, dict):
        return None, "objet imbrique (plusieurs sous-surfaces) -- non conforme au schema attendu"

    if isinstance(valeur, list):
        return None, "liste inattendue pour une surface -- non conforme au schema attendu"

    texte = str(valeur).replace("–", "-").replace("—", "-")
    nombres = re.findall(_NOMBRE, texte)
    if not nombres:
        return None, f"aucun nombre extractible dans : {texte[:80]!r}"

    valeurs = [float(n.replace(",", ".")) for n in nombres]
    # Plage type "14-18" : la regex capture 14 et 18 separement -> moyenne = milieu de plage.
    # Texte libre avec plusieurs nombres (rare) : moyenne aussi, choix assume et documente.
    return sum(valeurs) / len(valeurs), ""


def calculer_ecart_pct(estimee: Optional[float], reference: Optional[float]) -> Optional[float]:
    if estimee is None or reference is None or reference == 0:
        return None
    return round(abs(estimee - reference) / reference * 100, 1)


# 3. Pertinence materiaux (0-5) -- heuristique, PAS une validation expert

def _normaliser(texte: str) -> str:
    decompose = unicodedata.normalize("NFD", str(texte))
    return "".join(c for c in decompose if unicodedata.category(c) != "Mn").lower()


def score_pertinence_materiaux(materiaux_identifies, elements_visibles_reference: str) -> tuple[float, dict]:
    """
    Chevauchement heuristique entre les materiaux generes par le modele et
    la description de reference (colonne elements_visibles du CSV).
    Note 0-5 = (nb mots-cles de reference retrouves / nb mots-cles de
    reference) * 5, arrondi. PAS une notation par un expert -- limite
    connue et deja documentee pour le meme type d'heuristique en texte
    (cf. scoring_texte.py, bug underscore corrige mais matching litteral
    reste imparfait).
    """
    if not materiaux_identifies:
        return 0.0, {"raison": "aucun materiau identifie par le modele"}

    if isinstance(materiaux_identifies, list):
        texte_modele = _normaliser(" ".join(str(m) for m in materiaux_identifies))
    else:
        texte_modele = _normaliser(str(materiaux_identifies))

    reference_normalisee = _normaliser(elements_visibles_reference)
    mots_reference = [m for m in re.split(r"[^a-z]+", reference_normalisee) if len(m) > 4]
    mots_reference = list(dict.fromkeys(mots_reference))  # dedup en gardant l'ordre

    if not mots_reference:
        return 0.0, {"raison": "aucun mot-cle exploitable dans elements_visibles"}

    mots_trouves = []
    for mot in mots_reference:
        radical = mot[:6] if len(mot) > 6 else mot
        if radical in texte_modele:
            mots_trouves.append(mot)

    ratio = len(mots_trouves) / len(mots_reference)
    note = round(ratio * 5, 1)

    return note, {
        "mots_reference_totaux": len(mots_reference),
        "mots_reference_retrouves": len(mots_trouves),
        "mots_retrouves": mots_trouves,
    }


# Orchestration

def load_reference_lookup(csv_path: Path) -> dict:
    df = pd.read_csv(csv_path, encoding="utf-8-sig")
    required = {"nom_fichier", "piece", "elements_visibles", "surface_approx_m2", "statut"}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"Colonnes manquantes dans le CSV : {missing}")
    return {row["nom_fichier"]: row.to_dict() for _, row in df.iterrows()}


def run_scoring_vision(results_path: Path, csv_path: Path, output_path: Path) -> None:
    results = json.loads(results_path.read_text(encoding="utf-8"))
    reference_lookup = load_reference_lookup(csv_path)

    scored = []
    for r in results:
        if not r.get("success"):
            scored.append({
                "nom_fichier": r["nom_fichier"],
                "model_label": r["model_label"],
                "scorable": False,
                "raison_non_scorable": r.get("error", "echec inconnu"),
            })
            continue

        reference = reference_lookup.get(r["nom_fichier"])
        if reference is None:
            scored.append({
                "nom_fichier": r["nom_fichier"],
                "model_label": r["model_label"],
                "scorable": False,
                "raison_non_scorable": f"nom_fichier absent de {csv_path.name}",
            })
            continue

        parsed, json_valide, methode = parser_json_reponse(r["content"])

        surface_estimee_brute = parsed.get("surface_estimee_m2") if parsed else None
        surface_estimee, raison_surface_estimee = extraire_surface_numerique(surface_estimee_brute)
        surface_reference, raison_surface_reference = extraire_surface_numerique(reference["surface_approx_m2"])

        est_rejete = str(reference["statut"]).startswith("REJETE")
        if est_rejete:
            ecart_surface_pct = None
            raison_non_comparable = "photo REJETEE (pas une scene de chantier standard) -- comparaison de surface non pertinente"
        elif surface_estimee is None or surface_reference is None:
            ecart_surface_pct = None
            raisons = [x for x in [raison_surface_estimee, raison_surface_reference] if x]
            raison_non_comparable = " | ".join(raisons)
        else:
            ecart_surface_pct = calculer_ecart_pct(surface_estimee, surface_reference)
            raison_non_comparable = ""

        materiaux_identifies = parsed.get("materiaux_identifies") if parsed else None
        note_materiaux, detail_materiaux = score_pertinence_materiaux(
            materiaux_identifies, reference["elements_visibles"]
        )

        scored.append({
            "nom_fichier": r["nom_fichier"],
            "model_label": r["model_label"],
            "scorable": True,
            "statut_reference": reference["statut"],
            "json_parsability_score": 1 if json_valide else 0,
            "json_parsability_methode": methode,
            "surface_estimee_m2_brute": surface_estimee_brute,
            "surface_estimee_m2_extraite": surface_estimee,
            "surface_reference_m2": surface_reference,
            "ecart_surface_pct": ecart_surface_pct,
            "surface_non_comparable_raison": raison_non_comparable,
            "note_pertinence_materiaux_0_5": note_materiaux,
            "detail_pertinence_materiaux": detail_materiaux,
            "note_est_une_validation_expert": False,
            "latency_ms": r.get("latency_ms"),
            "estimated_cost_eur": r.get("estimated_cost_eur"),
        })

    scorables = [s for s in scored if s["scorable"]]
    avec_ecart = [s for s in scorables if s["ecart_surface_pct"] is not None]

    summary = {
        "nb_photos_total": len(scored),
        "nb_scorables": len(scorables),
        "taux_parsabilite_json_moyen": (
            sum(s["json_parsability_score"] for s in scorables) / len(scorables) if scorables else None
        ),
        "nb_surfaces_comparables": len(avec_ecart),
        "ecart_surface_pct_moyen": (
            sum(s["ecart_surface_pct"] for s in avec_ecart) / len(avec_ecart) if avec_ecart else None
        ),
        "note_pertinence_materiaux_moyenne": (
            sum(s["note_pertinence_materiaux_0_5"] for s in scorables) / len(scorables) if scorables else None
        ),
        "avertissement": (
            "note_pertinence_materiaux est une heuristique automatique, PAS une "
            "validation par un expert technico-commercial."
        ),
    }

    output_path.write_text(
        json.dumps({"summary": summary, "cas": scored}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"Scoring vision termine : {len(scored)} photos -> {output_path}")
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Validation des reponses vision (Sous-tache 2).")
    parser.add_argument("--results", type=Path, required=True)
    parser.add_argument("--csv", type=Path, default=Path("photos_metadata_complet.csv"))
    parser.add_argument("--output", type=Path, default=Path("scoring_vision_results.json"))
    args = parser.parse_args()

    run_scoring_vision(args.results, args.csv, args.output)