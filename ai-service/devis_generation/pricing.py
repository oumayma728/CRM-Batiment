"""
Résolution du JSON retourné par le LLM en occurrences de prestations avec
leurs composants (étapes 2 et 3 du flux), puis calcul des prix de vente à
partir du taux de marge saisi par le commercial (étape 5), et vérifications
associées (étapes 4 et... la vérification de quantité manquante).
"""
from typing import Dict, List

from . import repository
from .models import ComposantCalcule, OccurrencePrestation


def _ligne_composition_vers_composant(row: dict) -> ComposantCalcule:
    """Convertit une ligne SQL (PrestationComposition ou ChoixOptionComposition,
    même forme dans les deux cas) en ComposantCalcule. Une ligne a soit un
    materiau_id soit un service_id, jamais les deux (contrainte du schéma)."""
    if row["materiau_id"] is not None:
        return ComposantCalcule(
            type="materiau",
            id=row["materiau_id"],
            nom=row["materiau_nom"],
            unite=row["materiau_unite"],
            quantite_par_unite=row["quantite_par_unite"],
            cout_unitaire=row["materiau_cout"],
        )
    return ComposantCalcule(
        type="service_main_oeuvre",
        id=row["service_id"],
        nom=row["service_nom"],
        unite=row["service_unite"],
        quantite_par_unite=row["quantite_par_unite"],
        cout_unitaire=row["service_cout"],
    )


def construire_occurrence(
    prestation_id: int,
    quantite_ouvrage=None,
    options_choisies=None,
    uid: str = None,
) -> OccurrencePrestation:
    """Résout une prestation catalogue en occurrence (composants de base + options)."""
    options_choisies = options_choisies or []
    prestation = repository.fetch_prestation_full(prestation_id)

    composants = [
        _ligne_composition_vers_composant(row)
        for row in repository.fetch_prestation_composition(prestation_id)
    ]

    for option_nom in options_choisies:
        choix_option_id = repository.fetch_choix_option_id_by_name(prestation_id, option_nom)
        if choix_option_id is not None:
            composants += [
                _ligne_composition_vers_composant(row)
                for row in repository.fetch_choix_option_composition(choix_option_id)
            ]

    kwargs = dict(
        prestation_id=prestation_id,
        nom=prestation["nom"],
        unite=prestation["unite"],
        prix_vente_min=prestation["prix_vente_min"],
        prix_vente_max=prestation["prix_vente_max"],
        quantite_ouvrage=quantite_ouvrage,
        composants=composants,
        options_choisies=list(options_choisies),
        options_disponibles=repository.fetch_choix_option_noms(prestation_id),
    )
    if uid:
        kwargs["uid"] = uid
    return OccurrencePrestation(**kwargs)


def resoudre_occurrences(raw_llm_json: dict) -> List[OccurrencePrestation]:
    """
    À partir du JSON du LLM ({"prestations": [{"prestation_id", "quantite_ouvrage",
    "options": [...]}]}), résout chaque prestation en interrogeant la BD :
    infos de base, composants de la prestation, composants des options choisies.
    """
    occurrences = []

    for item in raw_llm_json.get("prestations", []):
        occurrences.append(
            construire_occurrence(
                prestation_id=item["prestation_id"],
                quantite_ouvrage=item.get("quantite_ouvrage"),
                options_choisies=item.get("options") or [],
            )
        )

    return occurrences


def appliquer_taux_marge(occurrences: List[OccurrencePrestation], taux_marge: float) -> None:
    """
    Calcule, pour chaque composant de chaque occurrence :
        prix_vente_unitaire = cout_unitaire * (1 + taux_marge)   [taux de MARGE, base = coût]
    Si la quantité d'ouvrage de l'occurrence est absente (None), les quantités
    et totaux restent à 0 — le blocage d'envoi est géré séparément par
    verifier_quantites_manquantes(), pas ici.

    Mutation en place (modifie les objets passés en argument).
    """
    for occ in occurrences:
        for comp in occ.composants:
            comp.prix_vente_unitaire = round(comp.cout_unitaire * (1 + taux_marge), 2)

            if occ.quantite_ouvrage is None:
                comp.quantite_calculee = 0.0
                comp.total_ht = 0.0
                comp.cout_total = 0.0
            else:
                comp.quantite_calculee = round(comp.quantite_par_unite * occ.quantite_ouvrage, 4)
                comp.total_ht = round(comp.quantite_calculee * comp.prix_vente_unitaire, 2)
                comp.cout_total = round(comp.quantite_calculee * comp.cout_unitaire, 2)

        occ.prix_vente_total = round(sum(c.total_ht or 0.0 for c in occ.composants), 2)


def verifier_fourchette(occurrences: List[OccurrencePrestation]) -> List[Dict]:
    """
    Alerte NON bloquante par prestation dont le prix de vente calculé sort de
    [prixVenteMin, prixVenteMax]. Ne s'applique qu'aux occurrences dont la
    quantité d'ouvrage est renseignée (sinon prix = 0, comparaison sans sens).
    """
    alertes = []
    for occ in occurrences:
        occ.alerte_fourchette = None
        if occ.quantite_ouvrage is None:
            continue

        if occ.prix_vente_total < occ.prix_vente_min:
            alerte = {
                "type": "FOURCHETTE_BASSE",
                "prestation_id": occ.prestation_id,
                "prestation_nom": occ.nom,
                "prix_calcule": occ.prix_vente_total,
                "borne": occ.prix_vente_min,
                "ecart": round(occ.prix_vente_min - occ.prix_vente_total, 2),
            }
        elif occ.prix_vente_total > occ.prix_vente_max:
            alerte = {
                "type": "FOURCHETTE_HAUTE",
                "prestation_id": occ.prestation_id,
                "prestation_nom": occ.nom,
                "prix_calcule": occ.prix_vente_total,
                "borne": occ.prix_vente_max,
                "ecart": round(occ.prix_vente_total - occ.prix_vente_max, 2),
            }
        else:
            continue

        occ.alerte_fourchette = alerte
        alertes.append(alerte)

    return alertes


def verifier_quantites_manquantes(occurrences: List[OccurrencePrestation]) -> List[Dict]:
    """
    Vérification BLOQUANTE, sans justification possible (contrairement à la
    marge globale) : retourne les occurrences dont la quantité d'ouvrage n'a
    pas été renseignée. Le devis ne peut pas être sauvegardé/envoyé tant que
    cette liste n'est pas vide.
    """
    return [
        {
            "uid": occ.uid,
            "prestation_id": occ.prestation_id,
            "prestation_nom": occ.nom,
        }
        for occ in occurrences
        if occ.quantite_ouvrage is None
    ]
