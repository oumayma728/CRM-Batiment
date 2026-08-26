"""
Modèles pour l'API OCR factures et plans.

- DocumentExtrait : modèle SQLAlchemy (table documents_extraits)
- FactureResponse : schéma Pydantic de réponse OCR factures
- DocumentResponse : schéma Pydantic de réponse document complet (avec type, statut, id, dates)
- DocumentUpdate : schéma Pydantic pour l'édition des champs extraits
- StatutUpdate : schéma Pydantic pour le changement de statut
"""
from datetime import datetime
from typing import Optional, List, Dict, Any

from pydantic import BaseModel, Field
from sqlalchemy import Column, Integer, String, Float, DateTime, JSON
from sqlalchemy.sql import func

from app.database import Base


# ---------------------------------------------------------------------------
# Modèle SQLAlchemy
# ---------------------------------------------------------------------------

class DocumentExtrait(Base):
    """Table documents_extraits -- un enregistrement par document traité (facture ou plan)."""
    __tablename__ = "documents_extraits"

    id = Column(Integer, primary_key=True, autoincrement=True)
    nom_fichier = Column(String, nullable=False)
    chemin_fichier = Column(String, nullable=True)  # chemin dans uploads/
    type_document = Column(String, nullable=False, default="facture")  # "facture" ou "plan"

    # Champs extraits pour les Factures
    date_facture = Column(String, nullable=True)
    numero_facture = Column(String, nullable=True)
    nom_fournisseur = Column(String, nullable=True)
    montant_ht = Column(Float, nullable=True)
    montant_tva = Column(Float, nullable=True)
    montant_ttc = Column(Float, nullable=True)
    produits = Column(JSON, default=list)

    # Champs extraits pour les Plans Architecturaux
    pieces = Column(JSON, default=list)  # [{"nom": str, "cotes": List[str], "surface_m2": Optional[float]}]
    surface_totale_m2 = Column(Float, nullable=True)
    lignes_devis_proposees = Column(JSON, default=list)  # [{"designation": str, "quantite": float, "unite": str}]
    pieces_sans_devis_possible = Column(JSON, default=list)  # [{"nom": str, "raison": str}]

    # Métadonnées
    technologie = Column(String, nullable=False)
    temps_traitement_s = Column(Float, nullable=False, default=0.0)
    statut = Column(String, nullable=False, default="en_attente")  # en_attente / valide / rejete
    motif_rejet = Column(String, nullable=True)
    erreur = Column(String, nullable=True)

    # Horodatage
    date_traitement = Column(DateTime, nullable=False, server_default=func.now())
    date_validation = Column(DateTime, nullable=True)


class CorrectionLog(Base):
    """Table corrections_log — trace chaque correction humaine sur un champ extrait par l'IA.

    Sert à analyser les faiblesses récurrentes des extracteurs.
    Pas de mécanisme de ré-entraînement — traçabilité et analyse uniquement.
    """
    __tablename__ = "corrections_log"

    id = Column(Integer, primary_key=True, autoincrement=True)
    document_id = Column(Integer, nullable=False)
    champ = Column(String, nullable=False)  # ex: "montant_ttc", "nom_fournisseur", "pieces"
    valeur_ia = Column(String, nullable=True)  # valeur originale extraite par l'IA
    valeur_corrigee = Column(String, nullable=True)  # valeur saisie par l'humain
    date_correction = Column(DateTime, nullable=False, server_default=func.now())


# ---------------------------------------------------------------------------
# Schémas Pydantic
# ---------------------------------------------------------------------------

class FactureResponse(BaseModel):
    """Résultat structuré de l'extraction OCR d'une facture."""

    id: Optional[int] = Field(None, description="ID du document créé en base")
    date_facture: Optional[str] = Field(None, description="Date de la facture au format JJ/MM/AAAA")
    numero_facture: Optional[str] = Field(None, description="Numéro de facture tel qu'écrit sur la facture")
    nom_fournisseur: Optional[str] = Field(None, description="Nom du fournisseur émetteur")
    montant_ht: Optional[float] = Field(None, description="Montant total HT en euros")
    montant_tva: Optional[float] = Field(None, description="Montant total TVA en euros")
    montant_ttc: Optional[float] = Field(None, description="Montant total TTC (net à payer) en euros")
    produits: List[str] = Field(default_factory=list, description="Liste des désignations produits/services")

    technologie_utilisee: str = Field(..., description="Nom de la techno OCR utilisée")
    temps_traitement_s: float = Field(..., description="Temps de traitement total en secondes")
    erreur: Optional[str] = Field(None, description="Message d'erreur si l'extraction a échoué, null sinon")
    avertissement_doublon: Optional[str] = Field(None, description="Message d'avertissement si un document de nom proche existe déjà")


class DocumentResponse(BaseModel):
    """Schéma complet d'un document (facture ou plan) avec statut et dates -- utilisé par le tableau."""

    id: int
    nom_fichier: str
    type_document: str = "facture"  # "facture" ou "plan"

    # Champs factures
    date_facture: Optional[str] = None
    numero_facture: Optional[str] = None
    nom_fournisseur: Optional[str] = None
    montant_ht: Optional[float] = None
    montant_tva: Optional[float] = None
    montant_ttc: Optional[float] = None
    produits: List[str] = Field(default_factory=list)

    # Champs plans
    pieces: List[Dict[str, Any]] = Field(default_factory=list)
    surface_totale_m2: Optional[float] = None
    lignes_devis_proposees: List[Dict[str, Any]] = Field(default_factory=list)
    pieces_sans_devis_possible: List[Dict[str, Any]] = Field(default_factory=list)

    technologie: str
    temps_traitement_s: float
    statut: str  # en_attente / valide / rejete
    motif_rejet: Optional[str] = None
    erreur: Optional[str] = None
    date_traitement: datetime
    date_validation: Optional[datetime] = None

    model_config = {"from_attributes": True}


class DocumentUpdate(BaseModel):
    """Schéma pour l'édition des champs extraits lors de la validation humaine."""

    # Factures
    date_facture: Optional[str] = None
    numero_facture: Optional[str] = None
    nom_fournisseur: Optional[str] = None
    montant_ht: Optional[float] = None
    montant_tva: Optional[float] = None
    montant_ttc: Optional[float] = None
    produits: Optional[List[str]] = None

    # Plans
    pieces: Optional[List[Dict[str, Any]]] = None
    surface_totale_m2: Optional[float] = None
    lignes_devis_proposees: Optional[List[Dict[str, Any]]] = None
    pieces_sans_devis_possible: Optional[List[Dict[str, Any]]] = None


class StatutUpdate(BaseModel):
    """Schéma pour le changement de statut (validation / rejet)."""

    statut: str = Field(..., pattern="^(valide|rejete)$")
    motif_rejet: Optional[str] = None
