"""
api.py — Endpoint FastAPI pour le matching catalogue (Sous-tache, Tache
"Matching catalogue et calcul de marges").

POST /api/devis/match-catalogue
  Entree  : {"description_libre": "...", "modalite_source": "texte|photo|vocal"}
  Sortie  : liste de lignes {sku_catalogue, label_prestation, quantite_estimee,
            prix_unitaire, sous_total, matching_confidence, non_trouve_dans_catalogue}

Calcul de marge reporte (cf. discussion -- aucune donnee de cout de revient
disponible). Ce endpoint ne fait QUE le matching catalogue.
"""

from __future__ import annotations

import base64
from pathlib import Path
from typing import Literal, Optional

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from catalogue_matching import matcher_description_vers_catalogue, LigneMatching
from extraction import extraire_description_depuis_photo, extraire_description_depuis_audio
from generer_devis_complet import generer_devis_complet, EntrepriseInfo, ClientInfo
from photo_analyze import analyser_photo_base64
from toolregistry.base import ProviderCallError
from vocal_transcribe import transcrire_avec_confiance

app = FastAPI(title="Module Devis IA — Matching Catalogue")

# CORS : necessaire pour que le frontend React (localhost:5173 en dev)
# puisse appeler cette API (127.0.0.1:8000) -- origines differentes.
# A restreindre au vrai domaine de prod avant mise en ligne.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DOSSIER_DEVIS_GENERES = Path("devis_generes")
DOSSIER_DEVIS_GENERES.mkdir(exist_ok=True)


class LigneMatchingResponse(BaseModel):
    sku_catalogue: Optional[str]
    label_prestation: str
    quantite_estimee: float
    unite: str
    prix_unitaire: Optional[float]
    sous_total: Optional[float]
    matching_confidence: float
    non_trouve_dans_catalogue: bool


# ANALYSE PHOTO STRUCTUREE (base64, pour appel direct depuis le frontend React)

class PhotoAnalyzeRequest(BaseModel):
    image_base64: str = Field(..., description="Image encodee en base64 (avec ou sans prefixe data:image/...;base64,)")


class PhotoAnalyzeResponse(BaseModel):
    model_config = {"populate_by_name": True}

    type_piece: str = Field(..., alias="type_pièce")
    surface_m2: Optional[float]
    confidence_surface: float
    materiaux: list[str] = Field(..., alias="matériaux")
    reference_visible: bool
    avertissement_extraction: Optional[str] = None
    photo_floue: bool = False
    objet_compte: Optional[str] = None
    nombre_unites_estimee: Optional[int] = None


@app.post("/api/devis/photo-analyze", response_model=PhotoAnalyzeResponse, response_model_by_alias=True)
def photo_analyze(requete: PhotoAnalyzeRequest) -> PhotoAnalyzeResponse:
    try:
        resultat = analyser_photo_base64(requete.image_base64)
    except ProviderCallError as e:
        raise HTTPException(status_code=502, detail=f"Echec de l'analyse photo : {e}")
    except (ValueError, base64.binascii.Error) as e:
        raise HTTPException(status_code=400, detail=f"Image base64 invalide : {e}")

    return PhotoAnalyzeResponse(
        type_pièce=resultat.type_piece,
        surface_m2=resultat.surface_m2,
        confidence_surface=resultat.confidence_surface,
        matériaux=resultat.materiaux,
        reference_visible=resultat.reference_visible,
        avertissement_extraction=resultat.avertissement_extraction,
        photo_floue=resultat.photo_floue,
        objet_compte=resultat.objet_compte,
        nombre_unites_estimee=resultat.nombre_unites_estimee,
    )


# ETAPE 1 : EXTRACTION (photo/vocal -> description candidate, PAS un devis)

class ExtractionResponse(BaseModel):
    description_extraite: str
    avertissements: list[str]
    donnees_brutes: dict
    provider_utilise: str
    model_utilise: str
    latency_ms: float
    necessite_validation_utilisateur: bool = True
    fallback_texte_recommande: bool = False


@app.post("/api/devis/extraire-photo", response_model=ExtractionResponse)
async def extraire_photo(file: UploadFile = File(...)) -> ExtractionResponse:
    """Analyse une photo et retourne une description CANDIDATE, a valider par l'utilisateur avant generation."""
    image_bytes = await file.read()
    try:
        resultat = extraire_description_depuis_photo(image_bytes)
    except ProviderCallError as e:
        raise HTTPException(status_code=502, detail=f"Echec de l'analyse photo : {e}")

    return ExtractionResponse(
        description_extraite=resultat.description_extraite,
        avertissements=resultat.avertissements,
        donnees_brutes=resultat.donnees_brutes,
        provider_utilise=resultat.provider_utilise,
        model_utilise=resultat.model_utilise,
        latency_ms=resultat.latency_ms,
        fallback_texte_recommande=resultat.fallback_texte_recommande,
    )


@app.post("/api/devis/extraire-vocal", response_model=ExtractionResponse)
async def extraire_vocal(file: UploadFile = File(...)) -> ExtractionResponse:
    """Transcrit un audio et retourne une description CANDIDATE, a valider par l'utilisateur avant generation."""
    audio_bytes = await file.read()
    try:
        resultat = extraire_description_depuis_audio(audio_bytes)
    except ProviderCallError as e:
        raise HTTPException(status_code=502, detail=f"Echec de la transcription : {e}")

    return ExtractionResponse(
        description_extraite=resultat.description_extraite,
        avertissements=resultat.avertissements,
        donnees_brutes=resultat.donnees_brutes,
        provider_utilise=resultat.provider_utilise,
        model_utilise=resultat.model_utilise,
        latency_ms=resultat.latency_ms,
    )


# TRANSCRIPTION AVEC SCORE DE CONFIANCE (pour VoiceRecorder.jsx)

class VocalTranscribeResponse(BaseModel):
    transcription_texte: str
    confidence_score: float
    duration_seconds: float


@app.post("/api/devis/vocal-transcribe", response_model=VocalTranscribeResponse)
async def vocal_transcribe(file: UploadFile = File(...), duration_seconds: float = 0.0) -> VocalTranscribeResponse:
    audio_bytes = await file.read()
    try:
        resultat = transcrire_avec_confiance(audio_bytes, duration_seconds=duration_seconds)
    except ProviderCallError as e:
        raise HTTPException(status_code=502, detail=f"Echec de la transcription : {e}")

    return VocalTranscribeResponse(
        transcription_texte=resultat.transcription_texte,
        confidence_score=resultat.confidence_score,
        duration_seconds=resultat.duration_seconds,
    )


# ETAPE 2 : GENERATION DU DEVIS (appelee UNIQUEMENT avec une description
# deja validee -- par l'utilisateur directement en texte, ou relue/corrigee
# apres une extraction photo/vocal de l'etape 1).

class GenererDevisRequest(BaseModel):
    description_validee: str = Field(..., min_length=1, description="Description validee par l'utilisateur (texte direct, ou relecture d'une extraction photo/vocal)")
    modalite_source: Literal["texte", "photo", "vocal"]
    entreprise_nom: str
    entreprise_adresse: str
    entreprise_tel: str
    entreprise_email: str
    client_nom: str
    client_adresse: str
    tva_pct: float = 10.0


class GenererDevisResponse(BaseModel):
    numero_devis: str
    date: str
    total_ht: float
    tva_pct: float
    montant_tva: float
    total_ttc: float
    lignes_trouvees: list[LigneMatchingResponse]
    lignes_non_trouvees: list[LigneMatchingResponse]
    document_url: str


@app.post("/api/devis/generer", response_model=GenererDevisResponse)
def generer_devis(requete: GenererDevisRequest) -> GenererDevisResponse:
    entreprise = EntrepriseInfo(requete.entreprise_nom, requete.entreprise_adresse, requete.entreprise_tel, requete.entreprise_email)
    client = ClientInfo(requete.client_nom, requete.client_adresse)

    try:
        # output_path fourni ici -> generer_devis_complet() rend aussi le
        # .docx directement (pas seulement les donnees JSON comme avant).
        # Le nom de fichier est determine APRES l'appel (numero_devis genere
        # a l'interieur de la fonction) -- on rend donc en 2 temps : d'abord
        # sans output_path pour recuperer le numero, puis on rend le docx
        # avec le bon nom de fichier.
        resultat = generer_devis_complet(
            description_libre=requete.description_validee,
            modalite_source=requete.modalite_source,
            entreprise=entreprise,
            client=client,
            tva_pct=requete.tva_pct,
        )
    except ProviderCallError as e:
        raise HTTPException(status_code=502, detail=f"Echec de la generation du devis : {e}")

    chemin_docx = DOSSIER_DEVIS_GENERES / f"{resultat['numero_devis']}.docx"
    from generer_devis_complet import rendre_docx
    rendre_docx(resultat, chemin_docx)

    def _convertir(l: LigneMatching) -> LigneMatchingResponse:
        return LigneMatchingResponse(
            sku_catalogue=l.sku_catalogue, label_prestation=l.label_prestation,
            quantite_estimee=l.quantite_estimee, unite=l.unite,
            prix_unitaire=l.prix_unitaire, sous_total=l.sous_total,
            matching_confidence=l.matching_confidence, non_trouve_dans_catalogue=l.non_trouve_dans_catalogue,
        )

    return GenererDevisResponse(
        numero_devis=resultat["numero_devis"], date=resultat["date"],
        total_ht=resultat["total_ht"], tva_pct=resultat["tva_pct"],
        montant_tva=resultat["montant_tva"], total_ttc=resultat["total_ttc"],
        lignes_trouvees=[_convertir(l) for l in resultat["lignes_trouvees"]],
        lignes_non_trouvees=[_convertir(l) for l in resultat["lignes_non_trouvees"]],
        document_url=f"/api/devis/{resultat['numero_devis']}/telecharger",
    )


@app.get("/api/devis/{numero_devis}/telecharger")
def telecharger_devis(numero_devis: str) -> FileResponse:
    chemin_docx = DOSSIER_DEVIS_GENERES / f"{numero_devis}.docx"
    if not chemin_docx.exists():
        raise HTTPException(status_code=404, detail=f"Devis {numero_devis} introuvable.")
    return FileResponse(
        path=chemin_docx,
        filename=f"{numero_devis}.docx",
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )


# GENERATION DEPUIS DES LIGNES DEJA VALIDEES (edition manuelle des quantites/
# prix par l'utilisateur) -- AUCUN appel IA ici, purement deterministe.

class LigneEditeeRequest(BaseModel):
    sku_catalogue: Optional[str] = None
    label_prestation: str
    quantite_estimee: float
    unite: str
    prix_unitaire: float


class GenererDepuisLignesRequest(BaseModel):
    lignes: list[LigneEditeeRequest]
    objet: str
    entreprise_nom: str
    entreprise_adresse: str
    entreprise_tel: str
    entreprise_email: str
    client_nom: str
    client_adresse: str
    tva_pct: float = 10.0


@app.post("/api/devis/generer-depuis-lignes", response_model=GenererDevisResponse)
def generer_depuis_lignes(requete: GenererDepuisLignesRequest) -> GenererDevisResponse:
    from generer_devis_complet import generer_devis_depuis_lignes

    entreprise = EntrepriseInfo(requete.entreprise_nom, requete.entreprise_adresse, requete.entreprise_tel, requete.entreprise_email)
    client = ClientInfo(requete.client_nom, requete.client_adresse)
    lignes = [l.model_dump() for l in requete.lignes]

    resultat = generer_devis_depuis_lignes(
        lignes=lignes, entreprise=entreprise, client=client,
        objet=requete.objet, tva_pct=requete.tva_pct,
    )

    chemin_docx = DOSSIER_DEVIS_GENERES / f"{resultat['numero_devis']}.docx"
    from generer_devis_complet import rendre_docx
    rendre_docx(resultat, chemin_docx)

    def _convertir(l: LigneMatching) -> LigneMatchingResponse:
        return LigneMatchingResponse(
            sku_catalogue=l.sku_catalogue, label_prestation=l.label_prestation,
            quantite_estimee=l.quantite_estimee, unite=l.unite,
            prix_unitaire=l.prix_unitaire, sous_total=l.sous_total,
            matching_confidence=l.matching_confidence, non_trouve_dans_catalogue=l.non_trouve_dans_catalogue,
        )

    return GenererDevisResponse(
        numero_devis=resultat["numero_devis"], date=resultat["date"],
        total_ht=resultat["total_ht"], tva_pct=resultat["tva_pct"],
        montant_tva=resultat["montant_tva"], total_ttc=resultat["total_ttc"],
        lignes_trouvees=[_convertir(l) for l in resultat["lignes_trouvees"]],
        lignes_non_trouvees=[],
        document_url=f"/api/devis/{resultat['numero_devis']}/telecharger",
    )


# MATCHING CATALOGUE SEUL (deja existant)


class MatchCatalogueRequest(BaseModel):
    description_libre: str = Field(..., min_length=1, description="Description libre du besoin (texte genere ou saisi)")
    modalite_source: Literal["texte", "photo", "vocal"] = Field(..., description="Modalite d'origine de la description")


class MatchCatalogueResponse(BaseModel):
    lignes: list[LigneMatchingResponse]
    nb_lignes_non_trouvees: int
    montant_total_ht_eur: Optional[float]


@app.post("/api/devis/match-catalogue", response_model=MatchCatalogueResponse)
def match_catalogue(requete: MatchCatalogueRequest) -> MatchCatalogueResponse:
    try:
        lignes: list[LigneMatching] = matcher_description_vers_catalogue(
            description_libre=requete.description_libre,
            catalogue_path=Path("catalogue.json"),
        )
    except ProviderCallError as e:
        raise HTTPException(status_code=502, detail=f"Echec du matching catalogue : {e}")

    lignes_reponse = [
        LigneMatchingResponse(
            sku_catalogue=l.sku_catalogue,
            label_prestation=l.label_prestation,
            quantite_estimee=l.quantite_estimee,
            unite=l.unite,
            prix_unitaire=l.prix_unitaire,
            sous_total=l.sous_total,
            matching_confidence=l.matching_confidence,
            non_trouve_dans_catalogue=l.non_trouve_dans_catalogue,
        )
        for l in lignes
    ]

    nb_non_trouvees = sum(1 for l in lignes if l.non_trouve_dans_catalogue)
    sous_totaux_connus = [l.sous_total for l in lignes if l.sous_total is not None]
    montant_total = round(sum(sous_totaux_connus), 2) if sous_totaux_connus else None

    return MatchCatalogueResponse(
        lignes=lignes_reponse,
        nb_lignes_non_trouvees=nb_non_trouvees,
        montant_total_ht_eur=montant_total,
    )


@app.get("/health")
def health():
    return {"status": "ok"}