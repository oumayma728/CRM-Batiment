"""
Point de bascule unique entre few-shot et RAG : changer CATALOGUE_STRATEGY
dans .env suffit, aucun autre fichier (ni le ToolRegistry, ni les endpoints
métier) n'a besoin d'être modifié.
"""
from typing import Optional

from .base import BaseCatalogueProvider
from .config import CatalogueConfig
from .few_shot_provider import FewShotCatalogueProvider
from .rag_provider import RAGCatalogueProvider


def get_catalogue_provider(config: Optional[CatalogueConfig] = None) -> BaseCatalogueProvider:
    config = config or CatalogueConfig()

    if config.strategie == "few_shot":
        return FewShotCatalogueProvider(cache_ttl_seconds=config.cache_ttl_seconds)
    elif config.strategie == "rag":
        return RAGCatalogueProvider(
            top_k=config.rag_top_k, cache_ttl_seconds=config.cache_ttl_seconds
        )
    else:
        raise ValueError(
            f"Stratégie catalogue inconnue : '{config.strategie}' "
            "(valeurs acceptées : 'few_shot', 'rag')"
        )
