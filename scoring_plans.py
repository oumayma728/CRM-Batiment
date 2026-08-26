"""
Scoring pour le benchmark des plans d'architecture.

Compare une instance de PlanExtractionResult avec une entrée de ground_truth_plans.json.

Règles de tolérance :
1. Noms de pièces : normalisés (minuscules, sans accents, parenthèses et espaces multiples).
2. surface_m2 : tolérance ±3%. RÈGLE STRICTE : expected=null et predicted=null = SUCCÈS (100%).
3. surface_totale_m2 : tolérance ±3%. RÈGLE STRICTE : expected=null et predicted=null = SUCCÈS (100%).
4. Pièces absentes : si une pièce de la vérité terrain n'est pas trouvée par le modèle,
   elle est comptée comme un échec pour cette pièce.
5. Précision : pénalise les hallucinations et faux positifs (ex: libellés techniques mal interprétés).
"""
import re
import unicodedata
from typing import Dict, Any, Optional
from app.services.extractors.base import PlanExtractionResult

TOLERANCE_SURFACE_RATIO = 0.03  # ±3%


def _normalize_name(s: Optional[str]) -> str:
    """Normalise un nom de pièce (minuscules, suppression accents, parenthèses et espaces multiples)."""
    if not s:
        return ""
    # Enlever les accents
    nfkd_form = unicodedata.normalize('NFKD', s)
    ascii_str = "".join([c for c in nfkd_form if not unicodedata.combining(c)]).lower()
    # Supprimer les parenthèses de niveau/zone (ex: "(rdc)", "(etage 1)", "(suite)")
    clean_str = re.sub(r'\(.*?\)', '', ascii_str)
    # Nettoyer les espaces
    return " ".join(clean_str.strip().split())


def _is_surface_match(pred: Optional[float], truth: Optional[float]) -> bool:
    """Vérifie si la surface prédite correspond à la vérité terrain à ±3% près.

    RÈGLE CLEF : truth is None et pred is None (ou absente) => True (Succès) !
    """
    if truth is None:
        return pred is None

    if pred is None:
        return False

    if truth == 0:
        return abs(pred) <= 0.01

    return abs(pred - truth) / abs(truth) <= TOLERANCE_SURFACE_RATIO


def score_plan_extraction(predicted: PlanExtractionResult, truth: Dict[str, Any]) -> Dict[str, Any]:
    """Compare l'extraction d'un plan avec la vérité terrain et retourne les métriques."""
    if predicted.error:
        return {
            "piece_recall": 0.0,
            "piece_precision": 0.0,
            "surface_m2_accuracy": 0.0,
            "surface_totale_ok": False,
            "overall_accuracy": 0.0,
            "error": predicted.error,
            "details": [],
        }

    truth_pieces = truth.get("pieces", [])
    pred_pieces = list(predicted.pieces or [])

    # Copie modifiable pour gérer les doublons (ex: 2 salons, 2 SDB)
    remaining_pred_pieces = list(pred_pieces)

    matched_count = 0
    surface_match_count = 0
    details = []

    # Évaluer chaque pièce de la vérité terrain
    for truth_p in truth_pieces:
        norm_name = _normalize_name(truth_p.get("nom"))
        exp_surf = truth_p.get("surface_m2")

        # Chercher une correspondance dans les pièces prédites restantes
        matching_idx = None
        for idx, pred_p in enumerate(remaining_pred_pieces):
            if _normalize_name(pred_p.get("nom")) == norm_name:
                matching_idx = idx
                break

        if matching_idx is not None:
            matched_count += 1
            matching_pred = remaining_pred_pieces.pop(matching_idx)
            pred_surf = matching_pred.get("surface_m2")
            surf_ok = _is_surface_match(pred_surf, exp_surf)
            if surf_ok:
                surface_match_count += 1
            details.append({
                "piece": truth_p.get("nom"),
                "matched": True,
                "expected_surf": exp_surf,
                "pred_surf": pred_surf,
                "surf_ok": surf_ok,
            })
        else:
            # Pièce non trouvée par le modèle
            surf_ok = _is_surface_match(None, exp_surf)  # True si exp_surf était null
            if surf_ok:
                surface_match_count += 1
            details.append({
                "piece": truth_p.get("nom"),
                "matched": False,
                "expected_surf": exp_surf,
                "pred_surf": None,
                "surf_ok": surf_ok,
            })

    total_truth_pieces = len(truth_pieces)
    piece_recall = (matched_count / total_truth_pieces) if total_truth_pieces > 0 else 1.0
    piece_precision = (matched_count / len(pred_pieces)) if len(pred_pieces) > 0 else 0.0
    surface_m2_accuracy = (surface_match_count / total_truth_pieces) if total_truth_pieces > 0 else 1.0

    # Vérifier la surface totale
    truth_totale = truth.get("surface_totale_m2")
    pred_totale = predicted.surface_totale_m2
    surface_totale_ok = _is_surface_match(pred_totale, truth_totale)

    # Note globale équilibrée (35% Rappel Pièces, 35% Précision Pièces, 15% Exactitude Surfaces, 15% Surface Totale)
    overall_accuracy = (piece_recall * 0.35) + (piece_precision * 0.35) + (surface_m2_accuracy * 0.15) + ((1.0 if surface_totale_ok else 0.0) * 0.15)

    return {
        "piece_recall": round(piece_recall, 3),
        "piece_precision": round(piece_precision, 3),
        "surface_m2_accuracy": round(surface_m2_accuracy, 3),
        "surface_totale_ok": surface_totale_ok,
        "overall_accuracy": round(overall_accuracy, 3),
        "total_pieces_truth": total_truth_pieces,
        "total_pieces_pred": len(pred_pieces),
        "error": None,
        "details": details,
    }
