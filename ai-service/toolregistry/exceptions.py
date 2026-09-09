"""
Exceptions personnalisées pour le ToolRegistry.
Centralise la gestion d'erreurs pour tous les providers (OpenAI, Anthropic, Google, ...),
conformément à la tâche : "ajouter gestion des erreurs, des timeouts et logging
structuré pour chaque appel API".
"""


class ToolRegistryError(Exception):
    """Exception de base pour toutes les erreurs du ToolRegistry."""
    pass


class ProviderTimeoutError(ToolRegistryError):
    """Levée quand un appel à un provider dépasse le timeout configuré."""

    def __init__(self, provider: str, model: str, timeout_seconds: float):
        self.provider = provider
        self.model = model
        self.timeout_seconds = timeout_seconds
        super().__init__(f"Timeout après {timeout_seconds}s pour {provider}/{model}")


class ProviderAPIError(ToolRegistryError):
    """Levée quand l'API d'un provider retourne une erreur (hors timeout)."""

    def __init__(self, provider: str, model: str, original_error: Exception):
        self.provider = provider
        self.model = model
        self.original_error = original_error
        super().__init__(f"Erreur API {provider}/{model}: {original_error}")


class UnsupportedModalityError(ToolRegistryError):
    """Levée quand un provider ne supporte pas une modalité demandée
    (ex: Anthropic ne fait pas de transcription audio nativement)."""

    def __init__(self, provider: str, modality: str):
        self.provider = provider
        self.modality = modality
        super().__init__(f"Le provider '{provider}' ne supporte pas la modalité '{modality}'")


class AllProvidersFailedError(ToolRegistryError):
    """Levée quand le provider principal ET tous les fallbacks configurés ont échoué."""

    def __init__(self, attempts: list):
        self.attempts = attempts
        details = "; ".join(
            f"{a['provider']}/{a['model']}: {a['error']}" for a in attempts
        )
        super().__init__(f"Tous les providers ont échoué. Détails: {details}")
