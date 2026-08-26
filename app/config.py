"""
Configuration centralisée — lit les variables d'environnement depuis .env.

Utilise pydantic-settings pour la validation et les valeurs par défaut.
Les clés optionnelles (OpenAI, Anthropic) retournent None si absentes ;
l'API retournera une erreur claire si on demande une techno dont la clé
n'est pas configurée.
"""
from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Paramètres de l'application, lus depuis les variables d'environnement / .env."""

    # --- Clés API actives ---
    GOOGLE_API_KEY: str = ""
    MISTRAL_API_KEY: str = ""
    GROQ_API_KEY: str = ""

    # --- Clés API optionnelles (budget à valider) ---
    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None

    # --- Paramètres métier ---
    DEFAULT_OCR_TECHNOLOGY: str = "gemini"

    # --- Base de donnees ---
    DATABASE_URL: str = "sqlite:///documents.db"

    # --- Paramètres serveur ---
    MAX_UPLOAD_SIZE_BYTES: int = 50 * 1024 * 1024  # 50 Mo

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",  # ignore les variables .env inconnues
    }


@lru_cache()
def get_settings() -> Settings:
    """Singleton de configuration, mis en cache pour éviter de relire .env à chaque requête."""
    return Settings()
