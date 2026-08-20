"""
test_e2e_texte.py — Sous-tache 2 (Tache Integration ToolRegistry) : test
end-to-end texte via ToolRegistry.generate_devis_from_text(), sur 3 cas
reels, avec validation du schema JSON et mesure de latence.
"""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

from toolregistry.registry import ToolRegistry

CAS_TEST = ["TXT-001", "TXT-002", "TXT-003"]


def valider_schema(contenu_json: dict) -> list[str]:
    """
    Verifie la presence et le type des champs attendus du schema de devis.
    Retourne la liste des ecarts (liste vide = schema valide).
    """
    ecarts = []

    if "prestations" not in contenu_json:
        ecarts.append("champ 'prestations' manquant")
    elif not isinstance(contenu_json["prestations"], list):
        ecarts.append("'prestations' n'est pas une liste")

    if "materiaux" not in contenu_json:
        ecarts.append("champ 'materiaux' manquant")
    elif not isinstance(contenu_json["materiaux"], list):
        ecarts.append("'materiaux' n'est pas une liste")

    if "estimation_prix_total_eur" not in contenu_json:
        ecarts.append("champ 'estimation_prix_total_eur' manquant")

    return ecarts


def run_test(csv_path: Path = Path("devis_texte_benchmark.csv")) -> None:
    df = pd.read_csv(csv_path)
    registry = ToolRegistry()

    resultats = []
    for case_id in CAS_TEST:
        ligne = df[df["id"] == case_id]
        if ligne.empty:
            print(f"{case_id} : introuvable dans le CSV, ignore")
            continue
        description = ligne.iloc[0]["description"]

        print(f"--- {case_id} ---")
        try:
            resultat = registry.generate_devis_from_text(description)
        except Exception as e:
            print(f"  ECHEC TOTAL (tous les fallbacks ont echoue) : {e}")
            resultats.append({"case_id": case_id, "success": False, "error": str(e)})
            print()
            continue

        ecarts = valider_schema(resultat.contenu_json)
        schema_valide = len(ecarts) == 0

        print(f"  Provider utilise : {resultat.provider_utilise}:{resultat.model_utilise} (fallback niveau {resultat.fallback_niveau})")
        print(f"  Latence : {resultat.latency_ms:.0f} ms")
        print(f"  Schema JSON valide : {schema_valide}" + (f" -- ecarts: {ecarts}" if ecarts else ""))
        if resultat.tentatives_echouees:
            print(f"  Tentatives echouees avant succes : {resultat.tentatives_echouees}")

        resultats.append({
            "case_id": case_id,
            "success": True,
            "provider": resultat.provider_utilise,
            "model": resultat.model_utilise,
            "fallback_niveau": resultat.fallback_niveau,
            "latency_ms": resultat.latency_ms,
            "schema_valide": schema_valide,
            "ecarts_schema": ecarts,
            "contenu": resultat.contenu_json,
        })
        print()

    output_path = Path("test_e2e_texte_resultats.json")
    output_path.write_text(json.dumps(resultats, ensure_ascii=False, indent=2), encoding="utf-8")

    nb_succes = sum(1 for r in resultats if r.get("success"))
    nb_schema_valide = sum(1 for r in resultats if r.get("schema_valide"))
    print(f"Termine. {nb_succes}/{len(resultats)} succes, {nb_schema_valide}/{len(resultats)} schema valide.")
    print(f"Resultats sauvegardes dans {output_path}")


if __name__ == "__main__":
    run_test()