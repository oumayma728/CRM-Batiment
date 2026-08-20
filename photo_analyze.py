"""
photo_analyze.py — Sous-tache 2 (Tache "Composant React PhotoUpload") :
POST /api/devis/photo-analyze -- image base64 en entree, sortie structuree
{type_piece, surface_m2, confidence_surface, materiaux, reference_visible}.

Different de /api/devis/extraire-photo (deja existant, upload multipart,
utilise pour les scripts) : celui-ci prend du base64 en JSON, adapte a un
appel direct depuis le frontend React (qui a deja l'image en base64 via
FileReader pour l'apercu).
"""

from __future__ import annotations

import base64
import re
from dataclasses import dataclass
from typing import Optional

from toolregistry.registry import ToolRegistry
from flou_detection import detecter_flou, SEUIL_VARIANCE_NETTETE


@dataclass
class PhotoAnalysisResultat:
    type_piece: str
    surface_m2: Optional[float]
    confidence_surface: float
    materiaux: list[str]
    reference_visible: bool
    avertissement_extraction: Optional[str] = None  # si extraction de secours utilisee
    photo_floue: bool = False  # cahier des charges P1 : "photo floue -> fallback texte"
    objet_compte: Optional[str] = None  # nom (pluriel) de l'element denombre, ex: "fenetres"
    nombre_unites_estimee: Optional[int] = None  # pour les elements factures a l'unite (fenetres, portes, etc.)


def decoder_image_base64(image_base64: str) -> bytes:
    """
    Decode une chaine base64, avec ou sans prefixe data URL
    (ex: "data:image/jpeg;base64,...") -- gere les deux cas, le frontend
    envoie generalement la data URL complete telle que produite par
    FileReader.readAsDataURL().
    """
    if image_base64.startswith("data:"):
        _, _, contenu = image_base64.partition(",")
        image_base64 = contenu
    return base64.b64decode(image_base64)


def _extraire_surface_numerique_secours(valeur) -> tuple[Optional[float], float]:
    """
    Extraction de secours si le modele repond quand meme en texte libre
    (ancien comportement, ou modele qui n'a pas suivi la consigne).
    Retourne (surface, confidence_surface_ajustee) -- confidence forcee a
    0.2 max si on doit passer par cette extraction heuristique, car ce
    n'est plus une confiance auto-evaluee par le modele mais une extraction
    de secours moins fiable.
    """
    if valeur is None:
        return None, 0.0
    if isinstance(valeur, (int, float)):
        return float(valeur), None  # cas normal, pas de degradation de confiance
    if isinstance(valeur, dict):
        return None, 0.0  # objet imbrique (plusieurs sous-surfaces) -- non exploitable ici

    texte = str(valeur)
    match = re.search(r"(\d+(?:[.,]\d+)?)", texte)
    if match:
        return float(match.group(1).replace(",", ".")), 0.2
    return None, 0.0


def analyser_photo_base64(image_base64: str, registry: Optional[ToolRegistry] = None) -> PhotoAnalysisResultat:
    if registry is None:
        registry = ToolRegistry()

    image_bytes = decoder_image_base64(image_base64)

    # Photo floue -> pas d'appel au modele de vision (cout inutile, resultat
    # de toute facon peu fiable) : on retourne directement un resultat vide
    # avec photo_floue=True, le frontend bascule alors vers l'onglet Texte.
    flou = detecter_flou(image_bytes)
    if flou.est_floue:
        return PhotoAnalysisResultat(
            type_piece="non determine",
            surface_m2=None,
            confidence_surface=0.0,
            materiaux=[],
            reference_visible=False,
            avertissement_extraction=(
                f"Photo trop floue pour etre analysee (score de nettete "
                f"{flou.variance_nettete:.0f}, seuil {SEUIL_VARIANCE_NETTETE:.0f}) -- "
                f"decris les travaux via l'onglet Texte a la place."
            ),
            photo_floue=True,
        )

    resultat = registry.analyze_photo(image_bytes)
    j = resultat.contenu_json

    surface_brute = j.get("surface_estimee_m2")
    confidence_brute = j.get("confidence_surface")
    avertissement_extraction = None

    if isinstance(surface_brute, (int, float)) and isinstance(confidence_brute, (int, float)):
        # Cas nominal : le modele a suivi le nouveau schema (nombre + confiance explicite).
        surface_m2 = float(surface_brute)
        confidence_surface = float(confidence_brute)
    else:
        # Cas de secours : ancien format texte, ou champ manquant --
        # extraction heuristique, confiance degradee explicitement.
        surface_m2, confidence_calculee = _extraire_surface_numerique_secours(surface_brute)
        confidence_surface = confidence_calculee if confidence_calculee is not None else float(confidence_brute or 0.0)
        avertissement_extraction = (
            "surface_m2 extraite par heuristique de secours (le modele n'a pas repondu "
            "avec le format numerique attendu) -- confidence_surface degradee en consequence."
        )

    reference_visible_brut = str(j.get("reference_visible_oui_non", "non")).strip().lower()
    reference_visible = reference_visible_brut.startswith("oui")

    materiaux = j.get("materiaux_identifies", [])
    if not isinstance(materiaux, list):
        materiaux = [str(materiaux)]

    # objet_compte / nombre_unites_estimee : uniquement pour les elements
    # factures a l'unite (fenetres, portes, radiateurs, ...) -- cf.
    # SYSTEM_PROMPT_VISION. Le modele peut renvoyer null pour les deux, ou
    # omettre les cles (anciennes reponses avant ce schema) ; on reste
    # tolerant et on n'expose un compte que si c'est un entier exploitable.
    objet_compte_brut = j.get("objet_compte")
    objet_compte = str(objet_compte_brut) if objet_compte_brut else None

    nombre_unites_brut = j.get("nombre_unites_estimee")
    nombre_unites_estimee = None
    if isinstance(nombre_unites_brut, bool):
        pass  # bool est une sous-classe de int en Python -- exclu explicitement
    elif isinstance(nombre_unites_brut, (int, float)):
        nombre_unites_estimee = int(nombre_unites_brut)
    elif isinstance(nombre_unites_brut, str):
        match_unites = re.search(r"(\d+)", nombre_unites_brut)
        if match_unites:
            nombre_unites_estimee = int(match_unites.group(1))

    # Un compte sans objet associe (ou l'inverse) n'est pas exploitable en
    # aval (catalogue_matching a besoin des deux pour generer une ligne
    # coherente) -- on ne garde le couple que si les deux sont presents.
    if objet_compte is None or nombre_unites_estimee is None:
        objet_compte = None
        nombre_unites_estimee = None

    return PhotoAnalysisResultat(
        type_piece=j.get("type_piece", "non determine"),
        surface_m2=surface_m2,
        confidence_surface=round(confidence_surface, 2),
        materiaux=[str(m) for m in materiaux],
        reference_visible=reference_visible,
        avertissement_extraction=avertissement_extraction,
        objet_compte=objet_compte,
        nombre_unites_estimee=nombre_unites_estimee,
    )