"""
test_matching_robustesse.py — Sous-tache 2 (Tache "Matching catalogue") :
teste le matching sur 10 cas divers, tires du vrai CSV de test texte, pour
verifier la robustesse (pas juste 1-2 cas favorables comme precedemment).
"""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

from catalogue_matching import matcher_description_vers_catalogue
from toolregistry.base import ProviderCallError
from toolregistry.registry import ToolRegistry

# Echantillon de 10 cas, choisi pour varier les types de prestation (pas les
# 10 premiers de suite, qui seraient moins representatifs de la diversite
# reelle du CSV) -- adapte les IDs si besoin selon ce qui existe chez toi.
CAS_TEST = [
    "TXT-001",  # Carrelage
    "TXT-002",  # Menuiserie
    "TXT-003",  # Ravalement
    "TXT-005",  # Peinture
    "TXT-008",  # Electricite
    "TXT-009",  # Isolation
    "TXT-011",  # Chauffage
    "TXT-013",  # Toiture
    "TXT-020",  # Climatisation
    "TXT-030",  # Terrassement
]


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
        type_prestation = ligne.iloc[0]["type_prestation"]

        print(f"--- {case_id} ({type_prestation}) ---")
        try:
            lignes_matching = matcher_description_vers_catalogue(description, registry=registry)
        except ProviderCallError as e:
            print(f"  ECHEC : {e}")
            resultats.append({"case_id": case_id, "type_prestation": type_prestation, "success": False, "error": str(e)})
            print()
            continue

        nb_trouvees = sum(1 for l in lignes_matching if not l.non_trouve_dans_catalogue)
        nb_non_trouvees = sum(1 for l in lignes_matching if l.non_trouve_dans_catalogue)
        confiances = [l.matching_confidence for l in lignes_matching if not l.non_trouve_dans_catalogue]
        confiance_moyenne = sum(confiances) / len(confiances) if confiances else None

        print(f"  Lignes matchees : {nb_trouvees} trouvees, {nb_non_trouvees} non trouvees")
        print(f"  Confiance moyenne (lignes trouvees) : {confiance_moyenne}")
        for l in lignes_matching:
            statut = "TROUVE" if not l.non_trouve_dans_catalogue else "NON TROUVE"
            print(f"    [{statut}] {l.sku_catalogue or '(aucun SKU)'} -- {l.label_prestation} -- qte={l.quantite_estimee} -- conf={l.matching_confidence}")

        resultats.append({
            "case_id": case_id,
            "type_prestation": type_prestation,
            "success": True,
            "nb_lignes_trouvees": nb_trouvees,
            "nb_lignes_non_trouvees": nb_non_trouvees,
            "confiance_moyenne": confiance_moyenne,
            "lignes": [
                {
                    "sku_catalogue": l.sku_catalogue,
                    "label_prestation": l.label_prestation,
                    "quantite_estimee": l.quantite_estimee,
                    "prix_unitaire": l.prix_unitaire,
                    "sous_total": l.sous_total,
                    "matching_confidence": l.matching_confidence,
                    "non_trouve_dans_catalogue": l.non_trouve_dans_catalogue,
                }
                for l in lignes_matching
            ],
        })
        print()

    output_path = Path("test_matching_robustesse_resultats.json")
    output_path.write_text(json.dumps(resultats, ensure_ascii=False, indent=2), encoding="utf-8")

    nb_success = sum(1 for r in resultats if r.get("success"))
    total_trouvees = sum(r.get("nb_lignes_trouvees", 0) for r in resultats)
    total_non_trouvees = sum(r.get("nb_lignes_non_trouvees", 0) for r in resultats)

    print("=== RESUME ===")
    print(f"Cas traites avec succes : {nb_success}/{len(resultats)}")
    print(f"Total lignes trouvees dans le catalogue : {total_trouvees}")
    print(f"Total lignes NON trouvees (besoin hors catalogue) : {total_non_trouvees}")
    print(f"Resultats sauvegardes dans {output_path}")


if __name__ == "__main__":
    run_test()