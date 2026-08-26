"""PaddleOCR et EasyOCR travaillent sur des images, pas des PDF directement."""
from typing import List
import fitz  # PyMuPDF
import numpy as np
from PIL import Image
import io


def pdf_to_images(pdf_path: str, dpi: int = 200) -> List["np.ndarray"]:
    """Retourne une image (array numpy RGB) par page du PDF."""
    doc = fitz.open(pdf_path)
    zoom = dpi / 72
    matrix = fitz.Matrix(zoom, zoom)
    images = []
    for page in doc:
        pix = page.get_pixmap(matrix=matrix)
        img = Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGB")
        images.append(np.array(img))
    doc.close()
    return images
