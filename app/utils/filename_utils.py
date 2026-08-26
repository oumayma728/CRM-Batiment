"""
Utilitaires de normalisation des noms de fichiers et détection des doublons.
"""
import os
import re


def normalize_filename(filename: str) -> str:
    """Normalise un nom de fichier pour la détection des doublons.

    Exemples :
    - "APS VILLA .pdf" -> "aps villa.pdf"
    - " Facture  104 (2) .PDF " -> "facture 104 (2).pdf"
    """
    if not filename:
        return "document"

    base_name = os.path.basename(filename).strip()
    stem, ext = os.path.splitext(base_name)

    # Nettoyer les espaces consécutifs et mettre en minuscule
    cleaned_stem = re.sub(r"\s+", " ", stem).strip().lower()
    cleaned_ext = ext.strip().lower()

    return f"{cleaned_stem}{cleaned_ext}"
