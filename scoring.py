"""
Précision = ce que la techno a extrait correspond-il à ce qui est écrit sur le document ?
Champ par champ, avec une tolérance adaptée à chaque type (les montants tolèrent 2 centimes
d'arrondi, les strings doivent matcher après normalisation).
"""
from app.services.extractors.base import ExtractionResult

NUMERIC_FIELDS = ["montant_ht", "montant_tva", "montant_ttc"]
STRING_FIELDS = ["numero_facture", "date_facture"]
TOLERANCE_EUR = 0.02


def _normalize(s):
    return (s or "").strip().replace(" ", "").lower()


def score_extraction(predicted: ExtractionResult, truth: dict) -> dict:
    if predicted.error:
        # Un échec total (timeout, PDF rejeté, JSON invalide...) = 0 partout,
        # mais on garde une trace de la cause dans le rapport plutôt que de la masquer.
        return {f: False for f in NUMERIC_FIELDS + STRING_FIELDS + ["nom_fournisseur"]} | {
            "field_accuracy": 0.0, "error": predicted.error
        }

    scores = {}
    for field in NUMERIC_FIELDS:
        pred_val, true_val = getattr(predicted, field), truth.get(field)
        scores[field] = (pred_val is not None and true_val is not None
                          and abs(pred_val - true_val) <= TOLERANCE_EUR)

    for field in STRING_FIELDS:
        scores[field] = _normalize(getattr(predicted, field)) == _normalize(truth.get(field))

    pred_f, true_f = _normalize(predicted.nom_fournisseur), _normalize(truth.get("nom_fournisseur"))
    scores["nom_fournisseur"] = bool(pred_f) and bool(true_f) and (pred_f in true_f or true_f in pred_f)

    scores["field_accuracy"] = sum(1 for v in scores.values() if v) / len(scores)
    scores["error"] = None
    return scores
