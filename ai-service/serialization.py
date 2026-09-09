"""Conversion des dataclasses du pipeline en dicts JSON-serialisables."""
from dataclasses import asdict
from typing import Any, Dict, List

from devis_generation.models import ComposantCalcule, DevisEnConstruction, OccurrencePrestation


def composant_to_dict(c: ComposantCalcule) -> Dict[str, Any]:
    return asdict(c)


def occurrence_to_dict(o: OccurrencePrestation) -> Dict[str, Any]:
    d = asdict(o)
    d["composants"] = [composant_to_dict(c) for c in o.composants]
    return d


def devis_to_dict(d: DevisEnConstruction) -> Dict[str, Any]:
    return {
        "devis_id": d.devis_id,
        "company_id": d.company_id,
        "client_id": d.client_id,
        "taux_marge": d.taux_marge,
        "tva_pourcent": d.tva_pourcent,
        "occurrences": [occurrence_to_dict(o) for o in d.occurrences],
    }


def session_to_dict(payload: Dict[str, Any]) -> Dict[str, Any]:
    out = dict(payload)
    out["occurrences"] = [occurrence_to_dict(o) for o in payload["occurrences"]]
    return out


def apply_quantite_updates(
    devis: DevisEnConstruction, updates: List[Dict[str, Any]]
) -> None:
    by_uid = {o.uid: o for o in devis.occurrences}
    for item in updates:
        occ = by_uid.get(item.get("uid"))
        if occ is None:
            continue
        q = item.get("quantite_ouvrage")
        if q is None or q == "":
            occ.quantite_ouvrage = None
        else:
            occ.quantite_ouvrage = float(q)
