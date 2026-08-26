"""
Routes Validation Humaine CDC â€” Ticket #2972.

Endpoints alias CDC qui enveloppent la logique existante de documents_routes
sans la dupliquer, et ajoutent le logging des corrections dans corrections_log.

Endpoints :
  POST /api/validation/confirm-expense      Confirme un document + log des corrections
  POST /api/validation/correct-field        Corrige un champ spÃ©cifique + log
  GET  /api/validation/corrections-log      Liste les corrections enregistrÃ©es
"""
import json
from datetime import datetime
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.facture_models import DocumentExtrait, DocumentResponse, CorrectionLog
from app.utils.logger import logger

router = APIRouter()


# ---------------------------------------------------------------------------
# SchÃ©mas Pydantic pour les requÃªtes
# ---------------------------------------------------------------------------

class ConfirmExpenseRequest(BaseModel):
    """RequÃªte de confirmation d'un document avec champs Ã©ventuellement corrigÃ©s."""
    document_id: int
    corrected_fields: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Champs corrigÃ©s par l'humain (ex: {'montant_ttc': 1250.00, 'nom_fournisseur': 'SARL Dupont'})"
    )


class CorrectFieldRequest(BaseModel):
    """RequÃªte de correction d'un champ spÃ©cifique."""
    document_id: int
    champ: str = Field(..., description="Nom du champ corrigÃ© (ex: 'montant_ttc')")
    valeur_corrigee: Any = Field(..., description="Nouvelle valeur saisie par l'humain")


class CorrectionLogResponse(BaseModel):
    """SchÃ©ma de rÃ©ponse pour une correction loguÃ©e."""
    id: int
    document_id: int
    champ: str
    valeur_ia: Optional[str] = None
    valeur_corrigee: Optional[str] = None
    date_correction: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_doc_or_404(doc_id: int, db: Session) -> DocumentExtrait:
    doc = db.query(DocumentExtrait).filter(DocumentExtrait.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail=f"Document {doc_id} introuvable")
    return doc


def _serialize_value(val: Any) -> Optional[str]:
    """SÃ©rialise une valeur quelconque en string pour le log."""
    if val is None:
        return None
    if isinstance(val, (dict, list)):
        return json.dumps(val, ensure_ascii=False)
    return str(val)


def _log_correction(db: Session, doc_id: int, champ: str, valeur_ia: Any, valeur_corrigee: Any) -> None:
    """InsÃ¨re une ligne dans corrections_log si la valeur a changÃ©."""
    ia_str = _serialize_value(valeur_ia)
    corrigee_str = _serialize_value(valeur_corrigee)
    if ia_str != corrigee_str:
        log_entry = CorrectionLog(
            document_id=doc_id,
            champ=champ,
            valeur_ia=ia_str,
            valeur_corrigee=corrigee_str,
        )
        db.add(log_entry)
        logger.info(f"Correction document #{doc_id} - champ '{champ}': '{ia_str}' -> '{corrigee_str}'")


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/confirm-expense", response_model=DocumentResponse)
def confirm_expense(req: ConfirmExpenseRequest, db: Session = Depends(get_db)):
    """Confirme un document (valide) et log les corrections si des champs ont Ã©tÃ© modifiÃ©s.

    Enveloppe la logique existante de PATCH /api/documents/{id} + PATCH /api/documents/{id}/statut.
    """
    doc = _get_doc_or_404(req.document_id, db)

    # Si des champs ont Ã©tÃ© corrigÃ©s, les appliquer et logger les diffÃ©rences
    if req.corrected_fields:
        for field_name, new_value in req.corrected_fields.items():
            old_value = getattr(doc, field_name, None)
            _log_correction(db, doc.id, field_name, old_value, new_value)
            setattr(doc, field_name, new_value)

    # Marquer comme validÃ©
    doc.statut = "valide"
    doc.motif_rejet = None
    doc.date_validation = datetime.now()

    db.commit()
    db.refresh(doc)
    logger.info(f"Document #{doc.id} confirmé et validé par un humain.")
    return DocumentResponse.model_validate(doc)


@router.post("/correct-field", response_model=DocumentResponse)
def correct_field(req: CorrectFieldRequest, db: Session = Depends(get_db)):
    """Corrige un champ spÃ©cifique et log la correction."""
    doc = _get_doc_or_404(req.document_id, db)

    if not hasattr(doc, req.champ):
        raise HTTPException(status_code=400, detail=f"Champ '{req.champ}' inconnu sur DocumentExtrait")

    old_value = getattr(doc, req.champ, None)
    _log_correction(db, doc.id, req.champ, old_value, req.valeur_corrigee)
    setattr(doc, req.champ, req.valeur_corrigee)

    db.commit()
    db.refresh(doc)
    logger.info(f"Document #{doc.id} confirmé et validé par un humain.")
    return DocumentResponse.model_validate(doc)


@router.get("/corrections-log", response_model=List[CorrectionLogResponse])
def list_corrections(
    document_id: Optional[int] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    """Liste les corrections humaines enregistrÃ©es (filtrable par document_id)."""
    query = db.query(CorrectionLog)
    if document_id is not None:
        query = query.filter(CorrectionLog.document_id == document_id)
    return query.order_by(CorrectionLog.date_correction.desc()).limit(limit).all()

from collections import Counter
from datetime import timedelta

@router.get("/metrics")
def get_system_metrics(db: Session = Depends(get_db)):
    """Endpoint de métriques & monitoring (#2978). Expose les statistiques de traitement et performances."""
    all_docs = db.query(DocumentExtrait).all()
    total_docs = len(all_docs)
    factures_count = sum(1 for d in all_docs if d.type_document == "facture")
    plans_count = sum(1 for d in all_docs if d.type_document == "plan")
    valides_count = sum(1 for d in all_docs if d.statut == "valide")
    rejete_count = sum(1 for d in all_docs if d.statut == "rejete")
    en_attente_count = sum(1 for d in all_docs if d.statut == "en_attente")
    erreurs_count = sum(1 for d in all_docs if d.erreur is not None)

    temps_moyen = (sum(d.temps_traitement_s for d in all_docs) / total_docs) if total_docs > 0 else 0.0
    taux_succes = ((total_docs - erreurs_count) / total_docs * 100) if total_docs > 0 else 100.0
    
    # Corrections
    all_corrections = db.query(CorrectionLog).order_by(CorrectionLog.date_correction.desc()).all()
    corrections_count = len(all_corrections)
    
    # Champs les plus corrigés
    champ_counts = Counter(c.champ for c in all_corrections)
    champs_les_plus_corriges = [{"champ": k, "count": v} for k, v in champ_counts.most_common(5)]
    
    # Statistiques par technologie
    tech_map: Dict[str, Dict[str, Any]] = {}
    for d in all_docs:
        tech = d.technologie or "inconnue"
        if tech not in tech_map:
            tech_map[tech] = {"total": 0, "total_time": 0.0, "erreurs": 0}
        tech_map[tech]["total"] += 1
        tech_map[tech]["total_time"] += d.temps_traitement_s or 0.0
        if d.erreur:
            tech_map[tech]["erreurs"] += 1
            
    par_technologie = []
    for tech, stats in tech_map.items():
        count = stats["total"]
        avg_time = stats["total_time"] / count if count > 0 else 0.0
        success_rate = ((count - stats["erreurs"]) / count * 100) if count > 0 else 100.0
        par_technologie.append({
            "technologie": tech,
            "total_documents": count,
            "temps_moyen_sec": round(avg_time, 2),
            "taux_succes_pct": round(success_rate, 1),
        })
    par_technologie.sort(key=lambda x: x["total_documents"], reverse=True)

    # Volumes journaliers (sur les 14 derniers jours)
    today = datetime.now().date()
    days_map: Dict[str, Dict[str, int]] = {}
    for i in range(13, -1, -1):
        day_str = (today - timedelta(days=i)).strftime("%d/%m")
        days_map[day_str] = {"factures": 0, "plans": 0, "corrections": 0}
        
    for d in all_docs:
        if d.date_traitement:
            dt = d.date_traitement if isinstance(d.date_traitement, datetime) else datetime.fromisoformat(str(d.date_traitement))
            day_str = dt.strftime("%d/%m")
            if day_str in days_map:
                if d.type_document == "facture":
                    days_map[day_str]["factures"] += 1
                else:
                    days_map[day_str]["plans"] += 1
                    
    for c in all_corrections:
        if c.date_correction:
            dt = c.date_correction if isinstance(c.date_correction, datetime) else datetime.fromisoformat(str(c.date_correction))
            day_str = dt.strftime("%d/%m")
            if day_str in days_map:
                days_map[day_str]["corrections"] += 1
                
    volumes_journaliers = [
        {"date": day_str, "factures": data["factures"], "plans": data["plans"], "total": data["factures"] + data["plans"], "corrections": data["corrections"]}
        for day_str, data in days_map.items()
    ]
    
    # Totaux métier
    total_montant_ttc = sum(d.montant_ttc for d in all_docs if d.montant_ttc is not None)
    total_surface_m2 = sum(d.surface_totale_m2 for d in all_docs if d.surface_totale_m2 is not None)

    # Récentes corrections
    recent_corrections = [
        {
            "id": c.id,
            "document_id": c.document_id,
            "champ": c.champ,
            "valeur_ia": c.valeur_ia,
            "valeur_corrigee": c.valeur_corrigee,
            "date": c.date_correction.strftime("%d/%m/%Y %H:%M") if c.date_correction else None,
        }
        for c in all_corrections[:10]
    ]

    return {
        "status": "healthy",
        "total_documents": total_docs,
        "repartition": {"factures": factures_count, "plans": plans_count},
        "statuts": {"en_attente": en_attente_count, "valide": valides_count, "rejete": rejete_count},
        "performances": {
            "temps_traitement_moyen_sec": round(temps_moyen, 2),
            "taux_succes_pct": round(taux_succes, 1),
            "documents_en_erreur": erreurs_count,
            "total_corrections_humaines": corrections_count,
        },
        "par_technologie": par_technologie,
        "volumes_journaliers": volumes_journaliers,
        "champs_les_plus_corriges": champs_les_plus_corriges,
        "totaux_metier": {
            "total_montant_ttc_eur": round(total_montant_ttc, 2),
            "total_surface_m2": round(total_surface_m2, 2),
        },
        "recent_corrections": recent_corrections,
    }


