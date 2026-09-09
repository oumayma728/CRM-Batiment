"""
Configuration centrale du ToolRegistry : quel (provider, modèle) utiliser pour
quelle modalité, et stratégie de fallback si le modèle principal échoue.

Exigence tâche : "Mettre à jour toolregistry/config.py avec mapping final...
ajouter fallback strategy configuration."

Toutes les valeurs sont surchargeables via variables d'environnement (.env),
voir .env.example à la racine du projet. Les valeurs par défaut ci-dessous
sont les candidats à valider par le benchmark (Phase 1) — à remplacer par la
stack réellement retenue une fois le benchmark terminé (tâche "Valider
ToolRegistry sur stack retenue").
"""
import os
from dataclasses import dataclass, field
from typing import Optional


def _env(key: str, default: str = "") -> str:
    return os.environ.get(key, default)


@dataclass
class ModelChoice:
    """Un couple (provider, modèle) pour une modalité donnée."""
    provider: str
    model: str


@dataclass
class ToolRegistryConfig:
    # --- Clés API (jamais committées, voir .env.example) ---
    openai_api_key: str = field(default_factory=lambda: _env("OPENAI_API_KEY"))
    anthropic_api_key: str = field(default_factory=lambda: _env("ANTHROPIC_API_KEY"))
    google_api_key: str = field(default_factory=lambda: _env("GOOGLE_API_KEY"))

    # --- Mapping modalité -> (provider, modèle) ---
    texte_provider: str = field(default_factory=lambda: _env("TEXTE_PROVIDER", "openai"))
    texte_model: str = field(default_factory=lambda: _env("TEXTE_MODEL", "gpt-4o-mini"))

    vision_provider: str = field(default_factory=lambda: _env("VISION_PROVIDER", "anthropic"))
    vision_model: str = field(
        default_factory=lambda: _env("VISION_MODEL", "claude-3-7-sonnet-20250219")
    )

    transcription_provider: str = field(
        default_factory=lambda: _env("TRANSCRIPTION_PROVIDER", "openai")
    )
    transcription_model: str = field(
        default_factory=lambda: _env("TRANSCRIPTION_MODEL", "whisper-1")
    )

    # --- Stratégie de fallback : provider/modèle de secours par modalité ---
    # Exemple donné dans le CDC : "si GPT-4o-mini timeout → Claude Haiku"
    texte_fallback_provider: Optional[str] = field(
        default_factory=lambda: _env("TEXTE_FALLBACK_PROVIDER") or None
    )
    texte_fallback_model: Optional[str] = field(
        default_factory=lambda: _env("TEXTE_FALLBACK_MODEL") or None
    )

    vision_fallback_provider: Optional[str] = field(
        default_factory=lambda: _env("VISION_FALLBACK_PROVIDER") or None
    )
    vision_fallback_model: Optional[str] = field(
        default_factory=lambda: _env("VISION_FALLBACK_MODEL") or None
    )

    # --- Timeout commun à tous les adapters ---
    timeout_seconds: float = field(
        default_factory=lambda: float(_env("TOOLREGISTRY_TIMEOUT_SECONDS", "30"))
    )

    def texte_choice(self) -> ModelChoice:
        return ModelChoice(self.texte_provider, self.texte_model)

    def vision_choice(self) -> ModelChoice:
        return ModelChoice(self.vision_provider, self.vision_model)

    def transcription_choice(self) -> ModelChoice:
        return ModelChoice(self.transcription_provider, self.transcription_model)

    def texte_fallback_choice(self) -> Optional[ModelChoice]:
        if self.texte_fallback_provider and self.texte_fallback_model:
            return ModelChoice(self.texte_fallback_provider, self.texte_fallback_model)
        return None

    def vision_fallback_choice(self) -> Optional[ModelChoice]:
        if self.vision_fallback_provider and self.vision_fallback_model:
            return ModelChoice(self.vision_fallback_provider, self.vision_fallback_model)
        return None
