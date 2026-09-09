"""
ToolRegistry : couche d'abstraction multi-provider pour la génération de
devis IA (texte, vision, transcription).

Usage typique dans le code métier (endpoints /api/devis/*) :

    from toolregistry import ToolRegistry

    registry = ToolRegistry()  # config chargée depuis les variables d'environnement
    resultat = registry.generate_devis_from_text(description, system_prompt=PROMPT_CATALOGUE)

Basculer d'un provider à l'autre = changer .env, jamais ce fichier ni le code métier.
"""
from .registry import ToolRegistry
from .config import ToolRegistryConfig
from .exceptions import (
    AllProvidersFailedError,
    ProviderAPIError,
    ProviderTimeoutError,
    ToolRegistryError,
    UnsupportedModalityError,
)

__all__ = [
    "ToolRegistry",
    "ToolRegistryConfig",
    "ToolRegistryError",
    "ProviderTimeoutError",
    "ProviderAPIError",
    "UnsupportedModalityError",
    "AllProvidersFailedError",
]
