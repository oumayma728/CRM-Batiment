"""
Validation des fichiers uploadés : type MIME et taille.

Utilisé par la route OCR facture pour rejeter les fichiers non supportés
ou trop volumineux avant de lancer l'extraction (économise du temps et des tokens API).
"""
from fastapi import HTTPException, UploadFile

from app.config import get_settings

# Types MIME acceptés par les extracteurs (PDF natif + images pour OCR)
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
}


async def validate_upload(file: UploadFile) -> None:
    """Valide le type MIME et la taille d'un fichier uploadé.

    Lève HTTPException(400) avec un message clair si le fichier est invalide.
    Remet le curseur de lecture au début après vérification de la taille.
    """
    settings = get_settings()

    # --- Vérification du type MIME ---
    content_type = file.content_type or ""
    if content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Type de fichier non supporté : '{content_type}'. "
                f"Types acceptés : {', '.join(sorted(ALLOWED_MIME_TYPES))}"
            ),
        )

    # --- Vérification de la taille ---
    # file.size est renseigné par FastAPI si le header Content-Length est présent.
    # Sinon, on lit le contenu pour mesurer (puis on rembobine).
    if file.size is not None:
        file_size = file.size
    else:
        content = await file.read()
        file_size = len(content)
        await file.seek(0)  # rembobiner pour que l'appelant puisse relire

    max_size = settings.MAX_UPLOAD_SIZE_BYTES
    if file_size > max_size:
        max_mo = max_size / (1024 * 1024)
        file_mo = file_size / (1024 * 1024)
        raise HTTPException(
            status_code=400,
            detail=(
                f"Fichier trop volumineux : {file_mo:.1f} Mo. "
                f"Taille maximale autorisée : {max_mo:.0f} Mo."
            ),
        )
