"""
Point d'entree du microservice FastAPI -- OCR Factures & Plans.

Lancement :
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
"""
from contextlib import asynccontextmanager

from dotenv import load_dotenv
load_dotenv()  # charge .env AVANT tout import qui lirait os.environ

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.routes.ocr_facture_routes import router as ocr_facture_router
from app.routes.plan_routes import router as plan_router
from app.routes.documents_routes import router as documents_router
from app.routes.validation_routes import router as validation_router
# --- Prometheus Metrics Definitions ---
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
from fastapi import Response
from app.utils.metrics import archai_documents_processed_total, archai_processing_time_seconds


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialise la base de donnees au demarrage."""
    init_db()
    yield


app = FastAPI(
    title="OCR Factures & Plans API",
    version="0.4.0",
    description=(
        "Microservice d'extraction de donnees de factures fournisseurs et plans d'architecture par IA/OCR. "
        "Supporte plusieurs technologies (Gemini, Mistral, EasyOCR, Tesseract, Groq hybride). "
        "Taches #2966, #2970 et #2972 du backlog."
    ),
    lifespan=lifespan,
)

# --- CORS pour le frontend React (Vite dev server) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Inclusion des routes ---
app.include_router(ocr_facture_router, prefix="/api/ia", tags=["OCR Factures"])
app.include_router(plan_router, prefix="/api/ia", tags=["Plans Architecturaux"])
app.include_router(documents_router, prefix="/api/documents", tags=["Documents"])
app.include_router(validation_router, prefix="/api/validation", tags=["Validation Humaine"])


# --- Health check ---
@app.get("/", tags=["Health"])
async def health_check():
    """Endpoint de verification que le service est en ligne."""
    return {"status": "ok", "service": "ocr-factures-plans"}

# --- Prometheus Metrics Endpoint ---
@app.get("/api/metrics", tags=["Monitoring"])
async def metrics():
    """Expose les métriques Prometheus brutes."""
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)
