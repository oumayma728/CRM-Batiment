"""
scoring_texte.py — Scoring automatique des sorties du benchmark texte.

Sous-tache 2 (Tache 1, Phase 1) :
- Verifie la parsabilite JSON (0-1) de chaque sortie brute
- Extrait les prestations/materiaux generes (parsing des sections Markdown,
  le prompt systeme actuel ne produit pas de JSON -- ce n'est PAS corrige
  ici, seulement mesure et documente)
- Calcule une notation metier heuristique 0-5, FAUTE DE VRAIE REFERENCE
  STRUCTUREE (devis_reference n'est qu'un ID placeholder dans le CSV et
  aucun vrai devis CRM n'est disponible a ce stade). Cette note n'est PAS
  une validation metier au sens du cahier des charges (section 3.2.2, qui
  exige une notation "validee par un profil technico-commercial") -- c'est
  un score de coherence automatique, a completer plus tard.
- Documente les ecarts par cas (troncature, sections manquantes, etc.)

Le schema de reference structuree vise a terme (inspire du format reel
observe dans le devis Pronergy fourni par l'utilisateur, section
"Description | Quantite | Prix unitaire | TVA % | Montant TVA | Total")
est defini dans REFERENCE_SCHEMA_DOC ci-dessous a titre de documentation :
aucune donnee de ce format n'existe encore pour les 31 cas du CSV.
"""

from __future__ import annotations
import unicodedata
import argparse
import json
import re
from pathlib import Path
from typing import Optional

import pandas as pd


# Documentation du schema de reference cible (pas encore peuple -- cf. docstring)

REFERENCE_SCHEMA_DOC = {
    "prestations": [
        {
            "description": "str",
            "quantite": "float",
            "prix_unitaire_eur": "float",
            "tva_pct": "float",
            "montant_tva_eur": "float",
            "total_eur": "float",
        }
    ],
    "total_ht_eur": "float",
    "total_tva_eur": "float",
    "total_ttc_eur": "float",
}


# 1. Parsabilite JSON (0 ou 1)

def score_json_parsability(content: str) -> tuple[int, str]:
    """
    Tente de parser le contenu en JSON. Retourne (score, methode).
    methode in {"direct", "bloc_json_fence", "aucune"}.
    """
    if not content:
        return 0, "aucune"

    try:
        json.loads(content)
        return 1, "direct"
    except (json.JSONDecodeError, ValueError):
        pass

    match = re.search(r"```json\s*(.*?)```", content, re.DOTALL)
    if match:
        try:
            json.loads(match.group(1).strip())
            return 1, "bloc_json_fence"
        except (json.JSONDecodeError, ValueError):
            pass

    return 0, "aucune"


# 2. Extraction prestations/materiaux depuis une sortie Markdown

_SECTION_PATTERNS = {
    "prestations": re.compile(r"prestations?\s+(a|à)\s+r(e|é)aliser", re.IGNORECASE),
    "materiaux": re.compile(r"mat(e|é)riaux\s+n(e|é)cessaires?", re.IGNORECASE),
}

_BULLET_LINE = re.compile(r"^\s*[-*•]\s+(.*)$")
_TABLE_ROW = re.compile(r"^\s*\|(.+)\|\s*$")
_QUANTITY_PATTERN = re.compile(r"\b\d+([.,]\d+)?\s*(m2|m²|kg|l|unit(e|é)s?|jours?|heures?|h)\b", re.IGNORECASE)


def _extract_section_lines(content: str, section_regex: re.Pattern) -> list[str]:
    """
    Extrait les lignes (puces ou lignes de tableau) qui suivent un titre de
    section jusqu'au prochain titre de section (ligne commencant par # ou **).
    """
    lines = content.splitlines()
    collected: list[str] = []
    in_section = False

    for line in lines:
        if section_regex.search(line):
            in_section = True
            continue
        if in_section:
            if re.match(r"^\s*#{1,6}\s+", line) or re.match(r"^\s*\*\*\d+[.)]", line):
                in_section = False
                continue
            bullet = _BULLET_LINE.match(line)
            table_row = _TABLE_ROW.match(line)
            if bullet:
                collected.append(bullet.group(1).strip())
            elif table_row:
                collected.append(table_row.group(1).strip())

    return collected


def extract_elements(content: str, parsed_json: Optional[dict] = None) -> dict:
    # Priorite au JSON structure si disponible (nouveau prompt) : extraction
    # directe, pas de regex necessaire.
    if isinstance(parsed_json, dict) and "prestations" in parsed_json:
        prestations = [str(p) for p in parsed_json.get("prestations") or []]
        materiaux_bruts = parsed_json.get("materiaux") or []
        materiaux = [
            f"{m.get('nom', '?')} ({m.get('quantite', '?')} {m.get('unite', '')})"
            if isinstance(m, dict) else str(m)
            for m in materiaux_bruts
        ]
        nb_quantites = sum(
            1 for m in materiaux_bruts
            if isinstance(m, dict) and m.get("quantite") not in (None, "", "?")
        )
        return {
            "prestations": prestations,
            "materiaux": materiaux,
            "nb_quantites_detectees": nb_quantites,
            "section_prestations_trouvee": bool(prestations),
            "section_materiaux_trouvee": bool(materiaux),
        }

    # Repli : ancien parsing Markdown (compatibilite avec les runs deja
    # effectues sous l'ancien prompt, ex: benchmark_mistral_complet.json).
    prestations = _extract_section_lines(content, _SECTION_PATTERNS["prestations"])
    materiaux = _extract_section_lines(content, _SECTION_PATTERNS["materiaux"])
    quantites = _QUANTITY_PATTERN.findall(content)

    return {
        "prestations": prestations,
        "materiaux": materiaux,
        "nb_quantites_detectees": len(quantites),
        "section_prestations_trouvee": bool(prestations),
        "section_materiaux_trouvee": bool(materiaux),
    }

# 3. Notation metier heuristique (0-5) -- PAS une validation expert

def _normalize_text(text: str) -> str:
    """Minuscule + suppression des accents, pour un matching plus tolerant
    (ex: 'electricite' et 'électrique' doivent pouvoir se rapprocher)."""
    decomposed = unicodedata.normalize("NFD", text)
    return "".join(c for c in decomposed if unicodedata.category(c) != "Mn").lower()


def _type_prestation_mentionne(type_prestation: str, content: str) -> bool:
    """
    Verifie si au moins un mot significatif du type de prestation apparait
    dans le contenu genere. Corrige deux problemes constates sur donnees
    reelles (31 cas Mistral) :
    - Les underscores dans type_prestation (ex: 'Placo_isolation') ne
      peuvent jamais matcher une phrase en francais naturel -- on les
      remplace par des espaces et on decoupe en mots.
    - Les variantes grammaticales/accents (ex: 'Electricite' vs le texte
      qui dit 'electrique') faisaient echouer un match exact -- on compare
      sur un radical (6 premiers caracteres) plutot que le mot entier.
    """
    content_norm = _normalize_text(content)
    mots = re.split(r"[_\s]+", _normalize_text(type_prestation))
    mots_significatifs = [m for m in mots if len(m) > 3]

    for mot in mots_significatifs:
        radical = mot[:6] if len(mot) > 6 else mot
        if radical in content_norm:
            return True
    return False

def score_heuristique_metier(
    content: str,
    extraction: dict,
    type_prestation: str,
    json_score: int,
    tokens_output: Optional[int],
    max_tokens_configure: int = 800,
) -> tuple[float, dict]:
    breakdown = {}

    breakdown["section_prestations_presente"] = 1 if extraction["section_prestations_trouvee"] else 0
    breakdown["section_materiaux_presente"] = 1 if extraction["section_materiaux_trouvee"] else 0
    breakdown["quantites_chiffrees_presentes"] = 1 if extraction["nb_quantites_detectees"] > 0 else 0

    breakdown["coherence_type_prestation"] = (
        1 if _type_prestation_mentionne(type_prestation, content) else 0
    )

    is_truncated = bool(tokens_output) and tokens_output >= max_tokens_configure
    # Une reponse JSON valide ne peut pas etre tronquee (un JSON mal ferme
    # echoue au parsing) -- json_valide=1 suffit a prouver la completude.
    # Sinon (ancien format Markdown), on garde le test de ponctuation de fin.
    if json_score == 1:
        ends_cleanly = True
    else:
        ends_cleanly = content.rstrip().endswith((".", "*", "»", '"', ":", ")"))
    breakdown["reponse_non_tronquee"] = 1 if (not is_truncated and ends_cleanly) else 0

    # coherence_type_prestation reste calcule et visible dans le detail,
    # mais ne compte plus dans le score /5 -- instable selon le format du
    # prompt (Markdown vs JSON) et les categories a plusieurs mots du CSV.
    criteres_comptes = {k: v for k, v in breakdown.items() if k != "coherence_type_prestation"}
    total = sum(criteres_comptes.values())
    return float(total), breakdown


# 4. Documentation des ecarts par cas

def documenter_ecarts(
    json_score: int,
    extraction: dict,
    heuristic_breakdown: dict,
    tokens_output: Optional[int],
    max_tokens_configure: int = 800,
) -> list[str]:
    ecarts = []

    if json_score == 0:
        ecarts.append(
            "Sortie non parseable en JSON (prompt systeme actuel produit du Markdown, "
            "pas du JSON)."
        )
    if not extraction["section_prestations_trouvee"]:
        ecarts.append("Aucune section 'Prestations a realiser' detectee.")
    if not extraction["section_materiaux_trouvee"]:
        ecarts.append("Aucune section 'Materiaux necessaires' detectee.")
    if extraction["nb_quantites_detectees"] == 0:
        ecarts.append("Aucune quantite chiffree detectee (m2, kg, unites, heures...).")
    if heuristic_breakdown["coherence_type_prestation"] == 0:
        ecarts.append("Le type de prestation attendu n'apparait pas explicitement dans la reponse.")
    if tokens_output and tokens_output >= max_tokens_configure:
        ecarts.append(
            f"Reponse tronquee : tokens_output={tokens_output} atteint la limite "
            f"max_tokens={max_tokens_configure} configuree dans benchmark_texte.py."
        )

    return ecarts


# Orchestration

def load_cases_lookup(csv_path: Path) -> dict:
    df = pd.read_csv(csv_path)
    return {
        row["id"]: {
            "description": row["description"],
            "type_prestation": row["type_prestation"],
            "devis_reference": row["devis_reference"],
        }
        for _, row in df.iterrows()
    }


def run_scoring(results_path: Path, csv_path: Path, output_path: Path) -> None:
    results = json.loads(results_path.read_text(encoding="utf-8"))
    cases_lookup = load_cases_lookup(csv_path)

    scored = []
    for r in results:
        if not r.get("success"):
            scored.append({
                "case_id": r["case_id"],
                "model_label": r["model_label"],
                "scorable": False,
                "raison_non_scorable": r.get("error", "echec inconnu"),
            })
            continue

        case_info = cases_lookup.get(r["case_id"])
        if case_info is None:
            scored.append({
                "case_id": r["case_id"],
                "model_label": r["model_label"],
                "scorable": False,
                "raison_non_scorable": f"case_id absent de {csv_path.name}",
            })
            continue

        content = r["content"]
        json_score, json_method = score_json_parsability(content)
        parsed_json = json.loads(content) if json_score == 1 and json_method == "direct" else None
        if json_score == 1 and json_method == "bloc_json_fence" and parsed_json is None:
            match = re.search(r"```json\s*(.*?)```", content, re.DOTALL)
            parsed_json = json.loads(match.group(1).strip()) if match else None
        extraction = extract_elements(content, parsed_json)
        heuristic_score, heuristic_breakdown = score_heuristique_metier(
            content=content,
            extraction=extraction,
            type_prestation=case_info["type_prestation"],
            tokens_output=r.get("tokens_output"),
            json_score=json_score,
        )
        ecarts = documenter_ecarts(
            json_score=json_score,
            extraction=extraction,
            heuristic_breakdown=heuristic_breakdown,
            tokens_output=r.get("tokens_output"),
        )

        scored.append({
            "case_id": r["case_id"],
            "model_label": r["model_label"],
            "scorable": True,
            "type_prestation": case_info["type_prestation"],
            "devis_reference_id": case_info["devis_reference"],
            "reference_structuree_disponible": False,
            "json_parsability_score": json_score,
            "json_parsability_methode": json_method,
            "extraction": extraction,
            "note_metier_heuristique_0_5": heuristic_score,
            "note_metier_detail": heuristic_breakdown,
            "note_metier_est_une_validation_expert": False,
            "ecarts": ecarts,
            "latency_ms": r.get("latency_ms"),
            "tokens_output": r.get("tokens_output"),
            "estimated_cost_eur": r.get("estimated_cost_eur"),
        })

    scorables = [s for s in scored if s["scorable"]]
    summary = {
        "nb_cas_total": len(scored),
        "nb_cas_scorables": len(scorables),
        "taux_parsabilite_json_moyen": (
            sum(s["json_parsability_score"] for s in scorables) / len(scorables)
            if scorables else None
        ),
        "note_metier_heuristique_moyenne": (
            sum(s["note_metier_heuristique_0_5"] for s in scorables) / len(scorables)
            if scorables else None
        ),
        "note_avertissement": (
            "Note heuristique automatique, PAS validee par un profil "
            "technico-commercial -- cf. cahier des charges section 3.2.2."
        ),
    }

    output = {"summary": summary, "reference_schema_cible": REFERENCE_SCHEMA_DOC, "cas": scored}
    output_path.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Scoring termine : {len(scored)} cas traites -> {output_path}")
    print(f"Resume : {json.dumps(summary, ensure_ascii=False, indent=2)}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Scoring automatique des sorties du benchmark texte.")
    parser.add_argument("--results", type=Path, required=True, help="JSON des resultats bruts (ex: benchmark_mistral_complet.json).")
    parser.add_argument("--csv", type=Path, default=Path("devis_texte_benchmark.csv"), help="CSV des cas de test.")
    parser.add_argument("--output", type=Path, default=Path("scoring_results.json"), help="Chemin du JSON de sortie.")
    args = parser.parse_args()

    run_scoring(args.results, args.csv, args.output)