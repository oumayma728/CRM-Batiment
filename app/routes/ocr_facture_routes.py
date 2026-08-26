"""
Route OCR Factures -- POST /api/ia/ocr-facture.

Upload -> validation -> extraction -> sauvegarde en DB -> reponse Pydantic.
Le fichier uploade est persiste dans uploads/ pour l'ecran de validation humaine.
"""
import os
import shutil
import tempfile

from fastapi import APIRouter, Depends, File, Query, UploadFile
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models.facture_models import DocumentExtrait, FactureResponse
from app.services.ocr_facture_service import get_extractor
from app.utils.file_validation_utils import validate_upload
from app.utils.filename_utils import normalize_filename
from app.utils.logger import logger
from app.utils.metrics import archai_documents_processed_total, archai_processing_time_seconds

router = APIRouter()

UPLOADS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")


@router.post(
    "/ocr-facture",
    response_model=FactureResponse,
    summary="Extraire les donnees d'une facture par OCR",
    description=(
        "Upload un fichier (PDF, JPEG ou PNG) et retourne les champs extraits "
        "(date, numero, fournisseur, montants, produits) en utilisant la technologie "
        "OCR demandee. Le resultat est sauvegarde en base avec le statut 'en_attente'."
    ),
)
async def extract_facture(
    file: UploadFile = File(..., description="Fichier facture (PDF, JPEG ou PNG, max 50 Mo)"),
    technology: str = Query(
        default=None,
        description="Technologie OCR a utiliser (gemini, mistral, easyocr, tesseract, groq...)",
    ),
    db: Session = Depends(get_db),
):
    """Endpoint principal d'extraction OCR de factures."""
    settings = get_settings()

    if technology is None:
        technology = settings.DEFAULT_OCR_TECHNOLOGY

    # 1. Validation du fichier uploade
    logger.info(f"Reçu fichier '{file.filename}' (Type MIME: {file.content_type}) pour OCR Facture avec moteur '{technology}'")
    await validate_upload(file)

    # 2. Vérification des doublons par nom de fichier normalisé
    norm_name = normalize_filename(file.filename or "")
    existing_docs = db.query(DocumentExtrait).filter(DocumentExtrait.type_document == "facture").all()
    duplicate_warning = None
    for existing in existing_docs:
        if normalize_filename(existing.nom_fichier) == norm_name:
            duplicate_warning = f"Attention : Un document similaire ('{existing.nom_fichier}', ID #{existing.id}) existe déjà en base."
            break

    # 3. Instanciation de l'extracteur
    extractor = get_extractor(technology)

    # 4. Sauvegarde temporaire du fichier pour l'extraction
    tmp_path = None
    try:
        ext = os.path.splitext(file.filename or "")[1] or ".pdf"
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name

        # 5. Extraction OCR
        result = extractor.extract(tmp_path)
        
        archai_processing_time_seconds.labels(engine=technology).observe(result.elapsed_seconds)

        if result.error:
            logger.error(f"Erreur extraction '{file.filename}' avec {technology}: {result.error}")
            archai_documents_processed_total.labels(type_document="facture", status="erreur").inc()
        else:
            logger.info(f"Extraction terminée avec succès pour '{file.filename}' en {result.elapsed_seconds:.2f}s")
            archai_documents_processed_total.labels(type_document="facture", status="succes").inc()

        # 6. Sauvegarde en base de données
        doc = DocumentExtrait(
            nom_fichier=file.filename or "document",
            type_document="facture",
            date_facture=result.date_facture,
            numero_facture=result.numero_facture,
            nom_fournisseur=result.nom_fournisseur,
            montant_ht=result.montant_ht,
            montant_tva=result.montant_tva,
            montant_ttc=result.montant_ttc,
            produits=result.produits or [],
            technologie=technology,
            temps_traitement_s=round(result.elapsed_seconds, 2),
            statut="en_attente",
            erreur=result.error,
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)

        # 7. Persister le fichier uploadé dans uploads/
        os.makedirs(UPLOADS_DIR, exist_ok=True)
        dest_filename = f"{doc.id}_{file.filename or 'document'}"
        dest_path = os.path.join(UPLOADS_DIR, dest_filename)
        shutil.copy2(tmp_path, dest_path)
        doc.chemin_fichier = dest_filename
        db.commit()

        # 8. Réponse Pydantic avec avertissement_doublon si applicable
        return FactureResponse(
            id=doc.id,
            date_facture=result.date_facture,
            numero_facture=result.numero_facture,
            nom_fournisseur=result.nom_fournisseur,
            montant_ht=result.montant_ht,
            montant_tva=result.montant_tva,
            montant_ttc=result.montant_ttc,
            produits=result.produits or [],
            technologie_utilisee=technology,
            temps_traitement_s=round(result.elapsed_seconds, 2),
            erreur=result.error,
            avertissement_doublon=duplicate_warning,
        )
    except Exception as e:
        logger.error(f"Erreur inattendue lors du traitement de '{file.filename}': {str(e)}", exc_info=True)
        raise e
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)
