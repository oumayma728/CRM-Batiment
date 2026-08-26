"""
Route Extraction de Plans Architecturaux -- POST /api/ia/devis-from-plan.

Upload -> validation -> extraction -> génération de devis -> sauvegarde en DB -> réponse Pydantic PlanResponse.
Le fichier uploadé est persité dans uploads/ pour la consultation et la validation humaine.
"""
import os
import shutil
import tempfile

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models.facture_models import DocumentExtrait
from app.models.plan_models import PlanResponse
from app.services.devis_generation_service import generate_devis_lines
from app.services.extractor_registry import get_extractor as registry_get_extractor
from app.utils.file_validation_utils import validate_upload
from app.utils.filename_utils import normalize_filename
from app.utils.logger import logger
from app.utils.metrics import archai_documents_processed_total, archai_processing_time_seconds

router = APIRouter()

UPLOADS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")


def get_plan_extractor(technology: str):
    """Factory d'extracteur pour les plans — délègue au registre centralisé."""
    try:
        return registry_get_extractor(technology, doc_type="plan")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post(
    "/devis-from-plan",
    response_model=PlanResponse,
    summary="Extraire les pièces, surfaces et générer les lignes de devis d'un plan d'architecture",
    description=(
        "Upload un fichier plan (PDF, JPEG ou PNG), extrait les pièces/surfaces "
        "et génère automatiquement les lignes de devis associées (Carrelage, pose m2)."
    ),
)
async def extract_plan(
    file: UploadFile = File(..., description="Fichier plan architectural (PDF, JPEG ou PNG, max 50 Mo)"),
    technology: str = Query(
        default="gemini",
        description="Technologie d'extraction à utiliser (gemini ou mistral)",
    ),
    db: Session = Depends(get_db),
):
    """Endpoint principal d'extraction de données à partir d'un plan d'architecture."""
    settings = get_settings()

    if not technology:
        technology = "gemini"

    # 1. Validation du fichier uploadé
    logger.info(f"Reçu fichier '{file.filename}' (Type MIME: {file.content_type}) pour Devis Plan avec moteur '{technology}'")
    await validate_upload(file)

    # 2. Vérification des doublons par nom de fichier normalisé
    norm_name = normalize_filename(file.filename or "")
    existing_docs = db.query(DocumentExtrait).filter(DocumentExtrait.type_document == "plan").all()
    duplicate_warning = None
    for existing in existing_docs:
        if normalize_filename(existing.nom_fichier) == norm_name:
            duplicate_warning = f"Attention : Un plan similaire ('{existing.nom_fichier}', ID #{existing.id}) existe déjà en base."
            break

    # 3. Instanciation de l'extracteur plan
    extractor = get_plan_extractor(technology)

    # 4. Sauvegarde temporaire du fichier pour l'extraction
    tmp_path = None
    try:
        ext = os.path.splitext(file.filename or "")[1] or ".pdf"
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name

        # 5. Extraction Plan (pièces, surfaces)
        result = extractor.extract_plan(tmp_path)
        
        archai_processing_time_seconds.labels(engine=technology).observe(result.elapsed_seconds)

        if result.error:
            logger.error(f"Erreur extraction plan '{file.filename}' avec {technology}: {result.error}")
            archai_documents_processed_total.labels(type_document="plan", status="erreur").inc()
        else:
            logger.info(f"Extraction plan terminée avec succès pour '{file.filename}' en {result.elapsed_seconds:.2f}s")
            archai_documents_processed_total.labels(type_document="plan", status="succes").inc()

        # 6. Génération automatique des lignes de devis
        devis_data = generate_devis_lines(result.pieces or [])

        # 7. Sauvegarde en base de données
        doc = DocumentExtrait(
            nom_fichier=file.filename or "plan",
            type_document="plan",
            pieces=result.pieces or [],
            surface_totale_m2=result.surface_totale_m2,
            lignes_devis_proposees=devis_data["lignes_devis_proposees"],
            pieces_sans_devis_possible=devis_data["pieces_sans_devis_possible"],
            technologie=technology,
            temps_traitement_s=round(result.elapsed_seconds, 2),
            statut="en_attente",
            erreur=result.error,
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)

        # 8. Persister le fichier uploadé dans uploads/
        os.makedirs(UPLOADS_DIR, exist_ok=True)
        dest_filename = f"{doc.id}_{file.filename or 'plan'}"
        dest_path = os.path.join(UPLOADS_DIR, dest_filename)
        shutil.copy2(tmp_path, dest_path)
        doc.chemin_fichier = dest_filename
        db.commit()

        # 9. Réponse Pydantic PlanResponse
        return PlanResponse(
            id=doc.id,
            pieces=result.pieces or [],
            surface_totale_m2=result.surface_totale_m2,
            lignes_devis_proposees=devis_data["lignes_devis_proposees"],
            pieces_sans_devis_possible=devis_data["pieces_sans_devis_possible"],
            technologie_utilisee=technology,
            temps_traitement_s=round(result.elapsed_seconds, 2),
            erreur=result.error,
            avertissement_doublon=duplicate_warning,
        )
    except Exception as e:
        logger.error(f"Erreur inattendue lors du traitement du plan '{file.filename}': {str(e)}", exc_info=True)
        raise e
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)
