"""
Configuration de la stratégie catalogue (few-shot ou RAG), pilotée par
variable d'environnement — le point de bascule unique du système.
"""
import os
from dataclasses import dataclass, field


def _env(key: str, default: str = "") -> str:
    return os.environ.get(key, default)


@dataclass
class CatalogueConfig:
    strategie: str = field(default_factory=lambda: _env("CATALOGUE_STRATEGY", "few_shot"))
    rag_top_k: int = field(default_factory=lambda: int(_env("CATALOGUE_RAG_TOP_K", "8")))
    cache_ttl_seconds: int = field(
        default_factory=lambda: int(_env("CATALOGUE_CACHE_TTL_SECONDS", "300"))
    )
