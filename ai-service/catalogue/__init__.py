"""
Module catalogue : fournit le contexte catalogue au LLM (via ToolRegistry),
selon la stratégie choisie (few-shot ou RAG).

Usage typique :

    from catalogue import get_catalogue_provider
    from toolregistry import ToolRegistry

    registry = ToolRegistry()
    catalogue_provider = get_catalogue_provider()  # lit CATALOGUE_STRATEGY dans .env

    system_prompt = catalogue_provider.build_system_prompt(description, company_id)
    resultat = registry.generate_devis_from_text(description, system_prompt=system_prompt)

Basculer de few-shot à RAG = changer CATALOGUE_STRATEGY=rag dans .env, rien d'autre.
"""
from .base import BaseCatalogueProvider, CataloguePrestation
from .config import CatalogueConfig
from .factory import get_catalogue_provider

__all__ = [
    "get_catalogue_provider",
    "CatalogueConfig",
    "BaseCatalogueProvider",
    "CataloguePrestation",
]
