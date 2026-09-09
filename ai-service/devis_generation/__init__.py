"""
Module devis_generation : orchestre le pipeline texte complet, de la
description libre jusqu'aux lignes de devis persistées.

Usage typique (endpoints /api/devis/*) :

    from devis_generation import demarrer_generation_devis, appliquer_marge_et_verifier, valider_et_sauvegarder
    from devis_generation.marges import peut_envoyer_devis

    devis = demarrer_generation_devis(description, company_id, client_id, createur_id)
    # ... interface de validation, le commercial ajuste la quantité d'ouvrage ...
    etat = appliquer_marge_et_verifier(devis, taux_marge=0.30)
    # ... le commercial valide ...
    resultat_marge = valider_et_sauvegarder(devis)

    if not peut_envoyer_devis(resultat_marge):
        # bloquer le bouton "Envoyer" côté frontend
        ...
"""
from .models import ComposantCalcule, DevisEnConstruction, OccurrencePrestation
from .pipeline import appliquer_marge_et_verifier, demarrer_generation_devis, valider_et_sauvegarder
from .marges import calcul_marges, peut_envoyer_devis

__all__ = [
    "demarrer_generation_devis",
    "appliquer_marge_et_verifier",
    "valider_et_sauvegarder",
    "calcul_marges",
    "peut_envoyer_devis",
    "DevisEnConstruction",
    "OccurrencePrestation",
    "ComposantCalcule",
]
