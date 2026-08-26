"""
Routes Documents -- CRUD, changement de statut, export et service de fichiers.

Endpoints :
  GET    /api/documents           Liste paginee + filtres
  GET    /api/documents/export    Export JSON filtre (le frontend genere XLSX/PDF)
  GET    /api/documents/{id}      Detail d'un document
  PATCH  /api/documents/{id}      Edition des champs extraits
  PATCH  /api/documents/{id}/statut  Changement de statut (valide/rejete)
  GET    /api/documents/{id}/fichier  Sert le fichier original uploade
"""
import os
import glob
import urllib.parse
import unicodedata
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy import desc, asc
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.facture_models import (
    DocumentExtrait,
    DocumentResponse,
    DocumentUpdate,
    StatutUpdate,
)

router = APIRouter()

UPLOADS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")


def _doc_to_response(doc: DocumentExtrait) -> DocumentResponse:
    """Convertit un enregistrement SQLAlchemy en schema Pydantic."""
    return DocumentResponse.model_validate(doc)


# ---------------------------------------------------------------------------
# Liste paginee avec filtres
# ---------------------------------------------------------------------------

@router.get("/", response_model=list[DocumentResponse])
def list_documents(
    # Pagination
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    type_document: Optional[str] = Query(None, description="facture ou plan"),
    statut: Optional[str] = Query(None, description="en_attente, valide, rejete"),
    fournisseur: Optional[str] = Query(None, description="Recherche texte sur nom_fournisseur"),
    numero: Optional[str] = Query(None, description="Recherche texte sur numero_facture"),
    date_debut: Optional[str] = Query(None, description="Date de traitement min (YYYY-MM-DD)"),
    date_fin: Optional[str] = Query(None, description="Date de traitement max (YYYY-MM-DD)"),
    montant_min: Optional[float] = Query(None, description="Montant TTC minimum"),
    montant_max: Optional[float] = Query(None, description="Montant TTC maximum"),
    # Tri
    sort_by: str = Query("date_traitement", description="Colonne de tri"),
    sort_dir: str = Query("desc", description="asc ou desc"),
    db: Session = Depends(get_db),
):
    """Liste les documents avec filtres et tri."""
    query = db.query(DocumentExtrait)

    # Appliquer les filtres
    if type_document:
        query = query.filter(DocumentExtrait.type_document == type_document)
    if statut:
        query = query.filter(DocumentExtrait.statut == statut)
    if fournisseur:
        query = query.filter(DocumentExtrait.nom_fournisseur.ilike(f"%{fournisseur}%"))
    if numero:
        query = query.filter(DocumentExtrait.numero_facture.ilike(f"%{numero}%"))
    if date_debut:
        query = query.filter(DocumentExtrait.date_traitement >= date_debut)
    if date_fin:
        query = query.filter(DocumentExtrait.date_traitement <= date_fin + " 23:59:59")
    if montant_min is not None:
        query = query.filter(DocumentExtrait.montant_ttc >= montant_min)
    if montant_max is not None:
        query = query.filter(DocumentExtrait.montant_ttc <= montant_max)

    # Appliquer le tri
    valid_sort_columns = {
        "date_traitement", "nom_fournisseur", "numero_facture",
        "montant_ht", "montant_tva", "montant_ttc", "statut", "technologie",
    }
    if sort_by not in valid_sort_columns:
        sort_by = "date_traitement"
    col = getattr(DocumentExtrait, sort_by)
    query = query.order_by(desc(col) if sort_dir == "desc" else asc(col))

    docs = query.offset(skip).limit(limit).all()
    return [_doc_to_response(d) for d in docs]


# ---------------------------------------------------------------------------
# Export JSON filtre (le frontend genere XLSX/PDF a partir de ca)
# ---------------------------------------------------------------------------

@router.get("/export", response_model=list[DocumentResponse])
def export_documents(
    ids: Optional[str] = Query(None, description="IDs separes par des virgules (selection)"),
    statut: Optional[str] = None,
    fournisseur: Optional[str] = None,
    date_debut: Optional[str] = None,
    date_fin: Optional[str] = None,
    montant_min: Optional[float] = None,
    montant_max: Optional[float] = None,
    db: Session = Depends(get_db),
):
    """Retourne les documents pour export -- soit par IDs, soit par filtres."""
    query = db.query(DocumentExtrait)

    if ids:
        id_list = [int(i.strip()) for i in ids.split(",") if i.strip().isdigit()]
        query = query.filter(DocumentExtrait.id.in_(id_list))
    else:
        if statut:
            query = query.filter(DocumentExtrait.statut == statut)
        if fournisseur:
            query = query.filter(DocumentExtrait.nom_fournisseur.ilike(f"%{fournisseur}%"))
        if date_debut:
            query = query.filter(DocumentExtrait.date_traitement >= date_debut)
        if date_fin:
            query = query.filter(DocumentExtrait.date_traitement <= date_fin + " 23:59:59")
        if montant_min is not None:
            query = query.filter(DocumentExtrait.montant_ttc >= montant_min)
        if montant_max is not None:
            query = query.filter(DocumentExtrait.montant_ttc <= montant_max)

    docs = query.order_by(desc(DocumentExtrait.date_traitement)).all()
    return [_doc_to_response(d) for d in docs]


# ---------------------------------------------------------------------------
# Detail d'un document
# ---------------------------------------------------------------------------

@router.get("/{doc_id}", response_model=DocumentResponse)
def get_document(doc_id: int, db: Session = Depends(get_db)):
    """Retourne le detail d'un document par son ID."""
    doc = db.query(DocumentExtrait).filter(DocumentExtrait.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail=f"Document {doc_id} introuvable")
    return _doc_to_response(doc)


# ---------------------------------------------------------------------------
# Edition des champs extraits (validation humaine)
# ---------------------------------------------------------------------------

@router.patch("/{doc_id}", response_model=DocumentResponse)
def update_document(doc_id: int, update: DocumentUpdate, db: Session = Depends(get_db)):
    """Met a jour les champs extraits d'un document (edition lors de la validation)."""
    doc = db.query(DocumentExtrait).filter(DocumentExtrait.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail=f"Document {doc_id} introuvable")

    update_data = update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(doc, field, value)

    db.commit()
    db.refresh(doc)
    return _doc_to_response(doc)


# ---------------------------------------------------------------------------
# Changement de statut (valide / rejete)
# ---------------------------------------------------------------------------

@router.patch("/{doc_id}/statut", response_model=DocumentResponse)
def update_statut(doc_id: int, statut_update: StatutUpdate, db: Session = Depends(get_db)):
    """Change le statut d'un document (valide ou rejete avec motif optionnel)."""
    doc = db.query(DocumentExtrait).filter(DocumentExtrait.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail=f"Document {doc_id} introuvable")

    doc.statut = statut_update.statut
    doc.motif_rejet = statut_update.motif_rejet if statut_update.statut == "rejete" else None
    doc.date_validation = datetime.now()

    db.commit()
    db.refresh(doc)
    return _doc_to_response(doc)


from app.utils.logger import logger

@router.get("/{doc_id}/fichier")
def get_document_file(doc_id: int, db: Session = Depends(get_db)):
    """Sert le fichier original uploade pour affichage dans l'ecran de validation."""
    try:
        doc = db.query(DocumentExtrait).filter(DocumentExtrait.id == doc_id).first()
        if not doc:
            raise HTTPException(status_code=404, detail=f"Document {doc_id} introuvable")
        if not doc.chemin_fichier:
            raise HTTPException(status_code=404, detail="Fichier non disponible pour ce document")

        file_path = os.path.join(UPLOADS_DIR, doc.chemin_fichier)
        if not os.path.exists(file_path):
            matches = glob.glob(os.path.join(UPLOADS_DIR, f"{doc.id}_*"))
            if matches:
                file_path = matches[0]
            else:
                raise HTTPException(status_code=404, detail="Fichier introuvable sur le serveur")

        # Determiner le type MIME
        ext = os.path.splitext(file_path)[1].lower()
        media_types = {".pdf": "application/pdf", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png"}
        media_type = media_types.get(ext, "application/octet-stream")

        return FileResponse(
            file_path,
            media_type=media_type,
            content_disposition_type="inline",
            filename=doc.nom_fichier,
        )
    except Exception as e:
        logger.error(f"Erreur dans get_document_file pour doc_id={doc_id}: {e}", exc_info=True)
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))

