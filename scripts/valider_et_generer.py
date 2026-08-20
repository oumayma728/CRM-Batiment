"""
valider_et_generer.py — Flux interactif complet : upload photo/audio ->
affichage de ce que l'API a compris -> validation ou correction par
l'utilisateur -> generation du devis SEULEMENT apres validation.

Usage (depuis la racine AI Devis) :
  python -m scripts.valider_et_generer --photo ressources\1.jpeg
  python -m scripts.valider_et_generer --audio ressources\7.mp3

Necessite que l'API tourne deja (uvicorn api:app --reload) dans un autre
terminal.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import requests

API_URL = "http://127.0.0.1:8000"


def extraire(fichier: Path, modalite: str) -> dict:
    endpoint = "extraire-photo" if modalite == "photo" else "extraire-vocal"
    with open(fichier, "rb") as f:
        response = requests.post(f"{API_URL}/api/devis/{endpoint}", files={"file": f})
    response.raise_for_status()
    return response.json()


def demander_validation(description_extraite: str, avertissements: list[str]) -> str:
    print("\n=== CE QUE L'API A COMPRIS ===")
    print(description_extraite)

    if avertissements:
        print("\n=== AVERTISSEMENTS ===")
        for a in avertissements:
            print(f"  ⚠ {a}")

    print("\n=== VALIDATION ===")
    print("Appuie sur Entree pour VALIDER tel quel, ou tape le texte corrige puis Entree :")
    correction = input("> ").strip()

    return correction if correction else description_extraite


def generer_devis(description_validee: str, modalite: str, entreprise: dict, client: dict, tva_pct: float = 10.0) -> dict:
    payload = {
        "description_validee": description_validee,
        "modalite_source": modalite,
        "entreprise_nom": entreprise["nom"],
        "entreprise_adresse": entreprise["adresse"],
        "entreprise_tel": entreprise["tel"],
        "entreprise_email": entreprise["email"],
        "client_nom": client["nom"],
        "client_adresse": client["adresse"],
        "tva_pct": tva_pct,
    }
    # Encodage explicite UTF-8 -- meme correctif que celui applique en
    # PowerShell, mais fait cote script ici, donc pas de souci d'encodage.
    response = requests.post(
        f"{API_URL}/api/devis/generer",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json; charset=utf-8"},
    )
    response.raise_for_status()
    return response.json()


def telecharger_docx(numero_devis: str, destination: Path) -> None:
    response = requests.get(f"{API_URL}/api/devis/{numero_devis}/telecharger")
    response.raise_for_status()
    destination.write_bytes(response.content)


def main():
    parser = argparse.ArgumentParser(description="Flux interactif extraction -> validation -> generation de devis.")
    groupe = parser.add_mutually_exclusive_group(required=True)
    groupe.add_argument("--photo", type=Path, help="Chemin vers une photo de chantier")
    groupe.add_argument("--audio", type=Path, help="Chemin vers un enregistrement audio")
    args = parser.parse_args()

    if args.photo:
        fichier, modalite = args.photo, "photo"
    else:
        fichier, modalite = args.audio, "vocal"

    if not fichier.exists():
        print(f"Fichier introuvable : {fichier}")
        sys.exit(1)

    print(f"Extraction en cours depuis {fichier} ({modalite})...")
    extraction = extraire(fichier, modalite)

    description_validee = demander_validation(
        extraction["description_extraite"], extraction["avertissements"]
    )

    # A adapter avec les vraies infos entreprise/client -- en dur ici pour
    # le test, a remplacer par une vraie saisie ou un formulaire cote CRM.
    entreprise = {
        "nom": "3LM Solutions", "adresse": "1 Rue Test, 75000 Paris",
        "tel": "+33 1 00 00 00 00", "email": "contact@3lm.fr",
    }
    client = {"nom": "Client a definir", "adresse": "Adresse a definir"}

    print("\nGeneration du devis en cours...")
    resultat = generer_devis(description_validee, modalite, entreprise, client)

    print(f"\n=== DEVIS GENERE : {resultat['numero_devis']} ===")
    print(f"Total HT : {resultat['total_ht']} EUR")
    print(f"TVA ({resultat['tva_pct']}%) : {resultat['montant_tva']} EUR")
    print(f"Total TTC : {resultat['total_ttc']} EUR")
    print(f"Lignes trouvees : {len(resultat['lignes_trouvees'])}")
    print(f"Lignes non trouvees (hors catalogue) : {len(resultat['lignes_non_trouvees'])}")

    chemin_docx = Path(f"{resultat['numero_devis']}.docx")
    telecharger_docx(resultat["numero_devis"], chemin_docx)
    print(f"\nDocument telecharge : {chemin_docx}")


if __name__ == "__main__":
    main()