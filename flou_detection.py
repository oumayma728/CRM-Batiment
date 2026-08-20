"""
flou_detection.py — Detection heuristique de photo floue, utilisee AVANT
l'appel au modele de vision (cahier des charges P1 : "photo floue ->
fallback texte").

Methode : variance du filtre de detection de bords (approximation d'un
Laplacien) sur l'image en niveaux de gris. Une image nette a beaucoup de
transitions marquees (variance elevee) ; une image floue a des transitions
douces (variance faible). Technique standard et peu couteuse (pas de
dependance lourde type OpenCV, PIL suffit).

Seuil SEUIL_VARIANCE_NETTETE calibre empiriquement sur les 11 photos
reelles du jeu de benchmark (ressources/*.jpeg, *.jpg) :
  - Photos reelles (nettes) : variance entre 611 et 4454.
  - Version artificiellement floutee de la photo la moins nette du lot
    (variance 611 a l'origine) : variance ~91 des le premier cran de flou
    perceptible (GaussianBlur radius=1), ~35-50 pour un flou plus marque.
Seuil retenu : 250 -- marge confortable sous la plus basse photo nette
reelle, et bien au-dessus du plateau observe une fois l'image floutee.
A recalibrer si des photos reelles de chantier (pas seulement le jeu de
benchmark) donnent des faux positifs/negatifs.
"""

from __future__ import annotations

import io
from dataclasses import dataclass

from PIL import Image, ImageFilter, UnidentifiedImageError


SEUIL_VARIANCE_NETTETE = 250.0
TAILLE_MAX_ANALYSE = 800  # redimensionnement avant analyse, pour rester rapide


@dataclass
class ResultatFlou:
    est_floue: bool
    variance_nettete: float


def detecter_flou(image_bytes: bytes) -> ResultatFlou:
    """
    Calcule un score de nettete sur l'image et determine si elle est
    consideree trop floue pour une analyse vision fiable.

    Ne leve pas d'exception sur une image illisible/corrompue : dans ce
    cas, on considere qu'on ne peut pas juger (est_floue=False, variance=0.0)
    et on laisse l'appel au modele de vision suivre son cours normalement
    -- c'est a lui/aux avertissements existants de gerer une image invalide.
    """
    try:
        image = Image.open(io.BytesIO(image_bytes)).convert("L")
    except (UnidentifiedImageError, OSError):
        return ResultatFlou(est_floue=False, variance_nettete=0.0)

    image.thumbnail((TAILLE_MAX_ANALYSE, TAILLE_MAX_ANALYSE))
    bords = image.filter(ImageFilter.FIND_EDGES)

    # Pas de dependance numpy ici -- ImageStat suffit et evite un import
    # supplementaire juste pour une variance.
    from PIL import ImageStat
    stat = ImageStat.Stat(bords)
    variance = stat.var[0]

    return ResultatFlou(
        est_floue=variance < SEUIL_VARIANCE_NETTETE,
        variance_nettete=round(variance, 1),
    )
