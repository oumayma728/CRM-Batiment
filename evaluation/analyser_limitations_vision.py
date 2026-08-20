"""
analyser_limitations_vision.py — Sous-tache 3 (partie 1) : documenter les
cas problematiques du benchmark vision, en VERIFIANT les correlations
plutot qu'en les supposant.

Deux hypotheses a tester avec les vraies donnees :
1. "Photos floues -> latence elevee" : approximee via le statut
   REJETE_*/RESERVE_* (proxy de qualite/cadrage degrade, cf. CSV qui n'a
   pas de colonne "flou" dediee) compare a la latence moyenne.
2. "Absence d'objet de reference -> estimation +-30%" : correlation entre
   objet_reference_present et ecart_surface_pct, sur les seuls cas ou
   l'ecart est calculable (cf. limite deja documentee : 34/44 photos
   n'ont pas de surface de reference chiffree).
"""

from __future__ import annotations
import pandas as pd
import argparse
import json
import statistics
from pathlib import Path


def analyser(scoring_path: Path, csv_path: Path) -> dict:
    data = json.loads(scoring_path.read_text(encoding="utf-8"))
    cas = [c for c in data["cas"] if c["scorable"]]

    # --- Hypothese 1 : statut limitation vs latence ---
    limitation = [c for c in cas if not c["statut_reference"].startswith("VALIDE")]
    principal = [c for c in cas if c["statut_reference"].startswith("VALIDE")]

    latences_limitation = [c["latency_ms"] for c in limitation if c["latency_ms"] is not None]
    latences_principal = [c["latency_ms"] for c in principal if c["latency_ms"] is not None]

    hypothese_1 = {
        "nb_cas_limitation": len(limitation),
        "nb_cas_principal": len(principal),
        "latence_moyenne_limitation_ms": round(statistics.mean(latences_limitation), 1) if latences_limitation else None,
        "latence_moyenne_principal_ms": round(statistics.mean(latences_principal), 1) if latences_principal else None,
    }
    if hypothese_1["latence_moyenne_limitation_ms"] and hypothese_1["latence_moyenne_principal_ms"]:
        ecart = hypothese_1["latence_moyenne_limitation_ms"] - hypothese_1["latence_moyenne_principal_ms"]
        hypothese_1["ecart_ms"] = round(ecart, 1)
        hypothese_1["hypothese_confirmee"] = ecart > 0
    else:
        hypothese_1["hypothese_confirmee"] = None

    # --- Hypothese 2 : objet de reference vs ecart de surface ---
    # Necessite la colonne objet_reference_present -- pas encore dans
    # scoring_vision_results.json (uniquement statut_reference y figure).
    # On documente ici la limite plutot que d'inventer la donnee.
    df_ref = pd.read_csv(csv_path, encoding="utf-8-sig")
    ref_lookup = dict(zip(df_ref["nom_fichier"], df_ref["objet_reference_present"]))

    avec_ecart = [c for c in cas if c["ecart_surface_pct"] is not None]
    avec_objet_ref = [c for c in avec_ecart if str(ref_lookup.get(c["nom_fichier"], "")).strip().lower() == "oui"]
    sans_objet_ref = [c for c in avec_ecart if str(ref_lookup.get(c["nom_fichier"], "")).strip().lower() == "non"]
    hypothese_2 = {
        "nb_cas_avec_ecart_calculable": len(avec_ecart),
        "nb_cas_total": len(cas),
        "nb_avec_objet_reference": len(avec_objet_ref),
        "nb_sans_objet_reference": len(sans_objet_ref),
        "ecart_moyen_avec_objet_reference_pct": round(statistics.mean([c["ecart_surface_pct"] for c in avec_objet_ref]), 1) if avec_objet_ref else None,
        "ecart_moyen_sans_objet_reference_pct": round(statistics.mean([c["ecart_surface_pct"] for c in sans_objet_ref]), 1) if sans_objet_ref else None,
        "avertissement_echantillon": (
            f"Seulement {len(avec_ecart)} cas au total ont un ecart calculable -- "
            "trop peu pour tirer une conclusion statistique fiable, meme si un "
            "ecart apparait entre les deux groupes."
        ),
    }
    return {"hypothese_1_photos_floues_latence": hypothese_1, "hypothese_2_reference_absente_ecart": hypothese_2}

    return {
        "hypothese_1_photos_floues_latence": hypothese_1,
        "hypothese_2_reference_absente_ecart": hypothese_2,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Analyse des cas problematiques (Sous-tache 3).")
    parser.add_argument("--scoring", type=Path, default=Path("scoring_vision_results.json"))
    parser.add_argument("--csv", type=Path, default=Path("photos_metadata_complet.csv"))
    parser.add_argument("--output", type=Path, default=Path("limitations_vision.json"))
    args = parser.parse_args()

    resultat = analyser(args.scoring, args.csv)
    args.output.write_text(json.dumps(resultat, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(resultat, ensure_ascii=False, indent=2))