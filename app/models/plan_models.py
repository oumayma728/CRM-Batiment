"""
Modèles Pydantic pour les réponses de l'API extraction de plans architecturaux.

PlanResponse est le schéma de sortie de la route POST /api/ia/devis-from-plan.
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class PlanResponse(BaseModel):
    """Résultat structuré de l'extraction d'un plan d'architecture."""

    id: Optional[int] = Field(None, description="ID du document créé en base")
    pieces: List[Dict[str, Any]] = Field(default_factory=list, description="Liste des pièces identifiées (nom, cotes, surface_m2)")
    surface_totale_m2: Optional[float] = Field(None, description="Surface totale ou cumul de planchers exprimé en m2")
    lignes_devis_proposees: List[Dict[str, Any]] = Field(default_factory=list, description="Lignes de devis générées automatiquement pour les pièces avec surface")
    pieces_sans_devis_possible: List[Dict[str, Any]] = Field(default_factory=list, description="Pièces dont la surface est non renseignée (saisie manuelle requise)")

    technologie_utilisee: str = Field(..., description="Nom de la techno utilisée (gemini, mistral...)")
    temps_traitement_s: float = Field(..., description="Temps de traitement total en secondes")
    erreur: Optional[str] = Field(None, description="Message d'erreur si l'extraction a échoué, null sinon")
    avertissement_doublon: Optional[str] = Field(None, description="Message d'avertissement si un plan de nom proche existe déjà")
