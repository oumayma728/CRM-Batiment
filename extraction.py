"""
extraction.py — Etape d'extraction (photo/vocal -> description libre),
AVANT generation du devis -- point de validation utilisateur obligatoire
(cahier des charges P0 : "apercu avant validation" ; P1 : "transcription
incertaine -> confirmation avant generation").

Le flux complet est desormais :
  1. extraire_description_depuis_photo() / _depuis_audio() -- produit une
     description CANDIDATE, PAS encore un devis.
  2. L'UTILISATEUR relit/corrige cette description (etape hors de ce
     module, cote frontend/CRM -- cf. endpoints /api/devis/extraire-*).
  3. generer_devis_complet() est appele avec la description VALIDEE
     (potentiellement modifiee par l'utilisateur), jamais enchaine
     automatiquement depuis l'etape 1.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Optional

from toolregistry.registry import ToolRegistry
from flou_detection import detecter_flou, SEUIL_VARIANCE_NETTETE


@dataclass
class ExtractionResult:
    description_extraite: str
    modalite_source: str
    provider_utilise: str
    model_utilise: str
    latency_ms: float
    donnees_brutes: dict  # JSON vision ou texte transcrit brut, pour audit/debug
    avertissements: list = field(default_factory=list)  # signale a l'utilisateur avant validation
    fallback_texte_recommande: bool = False  # cahier des charges P1 : "photo floue -> fallback texte"


def extraire_description_depuis_photo(image_bytes: bytes, registry: Optional[ToolRegistry] = None) -> ExtractionResult:
    if registry is None:
        registry = ToolRegistry()

    # Photo floue -> pas d'appel au modele de vision, on recommande
    # directement de basculer vers l'onglet Texte (cf. flou_detection.py).
    flou = detecter_flou(image_bytes)
    if flou.est_floue:
        return ExtractionResult(
            description_extraite="",
            modalite_source="photo",
            provider_utilise="n/a",
            model_utilise="n/a",
            latency_ms=0.0,
            donnees_brutes={},
            avertissements=[
                f"Photo trop floue pour etre analysee (score de nettete "
                f"{flou.variance_nettete:.0f}, seuil {SEUIL_VARIANCE_NETTETE:.0f}) -- "
                f"decris les travaux via l'onglet Texte a la place."
            ],
            fallback_texte_recommande=True,
        )

    resultat = registry.analyze_photo(image_bytes)
    j = resultat.contenu_json

    type_piece = j.get("type_piece", "non determine")
    surface = j.get("surface_estimee_m2")
    materiaux = j.get("materiaux_identifies", [])
    materiaux_str = ", ".join(str(m) for m in materiaux) if materiaux else "aucun materiau identifie"

    # surface_estimee_m2 peut desormais etre un nombre, null, ou (ancien
    # format) du texte libre -- gere les 3 cas pour la description generee.
    if surface is None:
        surface_affichee = "non determinee"
    elif isinstance(surface, (int, float)):
        surface_affichee = f"{surface} m2"
    else:
        surface_affichee = str(surface)

    # objet_compte / nombre_unites_estimee (ex: "3 fenetres") -- uniquement
    # pour les elements factures a l'unite plutot qu'au m2, cf.
    # SYSTEM_PROMPT_VISION dans toolregistry/registry.py. Absent de la
    # description si le modele ne les a pas renvoyes (surface uniquement).
    objet_compte = j.get("objet_compte")
    nombre_unites_brut = j.get("nombre_unites_estimee")
    nombre_unites = None
    if isinstance(nombre_unites_brut, bool):
        pass  # bool est une sous-classe de int en Python -- exclu explicitement
    elif isinstance(nombre_unites_brut, (int, float)):
        nombre_unites = int(nombre_unites_brut)
    elif isinstance(nombre_unites_brut, str):
        match_unites = re.search(r"(\d+)", nombre_unites_brut)
        if match_unites:
            nombre_unites = int(match_unites.group(1))

    quantite_phrase = ""
    if objet_compte and nombre_unites is not None:
        quantite_phrase = f" Quantite estimee : {nombre_unites} {objet_compte}."

    description = (
        f"Photo de chantier analysee : {type_piece}. "
        f"Surface estimee : {surface_affichee}. "
        f"Materiaux identifies : {materiaux_str}."
        f"{quantite_phrase}"
    )

    avertissements = []
    confidence_surface = j.get("confidence_surface")
    if surface is None or (isinstance(confidence_surface, (int, float)) and confidence_surface < 0.5):
        avertissements.append("Surface non determinee avec confiance par le modele -- a verifier/completer manuellement avant validation.")
    elif isinstance(surface, str) and any(mot in surface.lower() for mot in ["impossible", "incertain", "non determin", "incapable"]):
        avertissements.append("Surface non determinee avec confiance par le modele -- a verifier/completer manuellement avant validation.")
    if not materiaux:
        avertissements.append("Aucun materiau identifie dans la photo -- description probablement incomplete.")
    if isinstance(j.get("surface_estimee_m2"), dict):
        avertissements.append("Plusieurs sous-surfaces detectees dans la photo (schema non standard) -- verifier la description generee.")

    return ExtractionResult(
        description_extraite=description,
        modalite_source="photo",
        provider_utilise=resultat.provider_utilise,
        model_utilise=resultat.model_utilise,
        latency_ms=resultat.latency_ms,
        donnees_brutes=j,
        avertissements=avertissements,
    )


def extraire_description_depuis_audio(audio_bytes: bytes, registry: Optional[ToolRegistry] = None) -> ExtractionResult:
    if registry is None:
        registry = ToolRegistry()

    resultat = registry.transcribe_audio(audio_bytes)
    texte = resultat.texte

    avertissements = []
    if len(texte.strip()) < 20:
        avertissements.append("Transcription tres courte -- echec partiel possible, a verifier avant validation.")
    # Detection heuristique de repetition (meme mode d'echec que documente
    # sur Whisper local pendant le benchmark -- cf. notes equipe).
    mots = texte.split()
    if len(mots) > 10:
        moitie = len(texte) // 2
        if texte[:moitie].strip() and texte[:moitie].strip() in texte[moitie:]:
            avertissements.append("Repetition detectee dans la transcription -- possible echec du modele, a verifier avant validation.")

    return ExtractionResult(
        description_extraite=texte,
        modalite_source="vocal",
        provider_utilise=resultat.provider_utilise,
        model_utilise=resultat.model_utilise,
        latency_ms=resultat.latency_ms,
        donnees_brutes={"transcription": texte},
        avertissements=avertissements,
    )