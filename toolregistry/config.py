"""
config.py — Configuration finale du ToolRegistry : mapping modele par
modalite + strategie de fallback (Sous-tache 1, Tache "Integration ToolRegistry").

Choix retenu : Mistral en PRINCIPAL sur les 3 modalites -- seul provider
avec des credits reels valides sur ce projet a ce stade (aucun credit
OpenAI/Anthropic disponible). Gemini en fallback "valide" quand des donnees
reelles existent (texte), sinon marque non valide. GPT-4o/Claude/Whisper
API restent en fallback THEORIQUE (jamais testes en conditions reelles) --
cf. recommandation_stack_ia.docx, section 3.

Aucun fallback theorique ne doit etre active en production sans validation
reelle prealable (obtenir des credits et refaire tourner le benchmark).

Override sans toucher au code : variables d'environnement TEXTE_MODEL,
VISION_MODEL, VOCAL_MODEL, format "provider:model_name"
(ex: TEXTE_MODEL=openai:gpt-4o-mini).
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class Provider(str, Enum):
    """Providers IA supportes par le ToolRegistry."""
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    MISTRAL = "mistral"
    MISTRAL_VOXTRAL = "mistral_voxtral"
    GEMINI = "gemini"
    WHISPER_LOCAL = "whisper_local"


class Modality(str, Enum):
    """Les trois modalites couvertes par le module Devis IA."""
    TEXT = "text"
    VISION = "vision"
    TRANSCRIPTION = "transcription"


@dataclass(frozen=True)
class ModelChoice:
    """
    Un choix de modele concret pour une modalite.

    Attributes:
        provider: identifiant du provider (cf. Provider enum, valeur string).
        model_name: nom exact du modele a passer a l'adaptateur.
        valide_reel: True si ce choix a ete teste avec des VRAIES donnees
            (pas du mock) sur ce projet. False = fallback theorique, a ne
            pas activer en prod sans validation prealable.
        nb_cas_reels: nombre de cas reels ayant servi a la validation,
            pour transparence (0 si jamais teste, cf. recommandation).
    """
    provider: str
    model_name: str
    valide_reel: bool
    nb_cas_reels: int = 0


@dataclass(frozen=True)
class ModalityConfig:
    """Configuration complete d'une modalite : choix principal + chaine de fallback ordonnee."""
    principal: ModelChoice
    fallbacks: list[ModelChoice] = field(default_factory=list)


# Mapping par defaut, base sur les resultats reels du benchmark Phase 1
# (cf. comparatif_consolide.xlsx et recommandation_stack_ia.docx).

_DEFAULT_CONFIG: dict[Modality, ModalityConfig] = {
    Modality.TEXT: ModalityConfig(
        principal=ModelChoice(Provider.MISTRAL.value, "mistral-small-latest", valide_reel=True, nb_cas_reels=31),
        fallbacks=[
            ModelChoice(Provider.GEMINI.value, "gemini-3.5-flash", valide_reel=True, nb_cas_reels=17),
            ModelChoice(Provider.OPENAI.value, "gpt-4o-mini", valide_reel=False, nb_cas_reels=0),
            ModelChoice(Provider.ANTHROPIC.value, "claude-3-5-haiku-20241022", valide_reel=False, nb_cas_reels=0),
        ],
    ),
    Modality.VISION: ModalityConfig(
        principal=ModelChoice(Provider.MISTRAL.value, "pixtral-12b-2409", valide_reel=True, nb_cas_reels=44),
        fallbacks=[
            # 1 seul cas teste avec un prompt non standard -- pas assez pour "valide_reel=True".
            ModelChoice(Provider.GEMINI.value, "gemini-3.5-flash", valide_reel=False, nb_cas_reels=1),
            ModelChoice(Provider.ANTHROPIC.value, "claude-3-7-sonnet-20250219", valide_reel=False, nb_cas_reels=0),
        ],
    ),
    Modality.TRANSCRIPTION: ModalityConfig(
        principal=ModelChoice(Provider.MISTRAL_VOXTRAL.value, "voxtral-mini-latest", valide_reel=True, nb_cas_reels=15),
        fallbacks=[
            # Valide reel mais avec une limite grave documentee (20% d'hallucinations/repetitions,
            # latence 30-60x superieure) -- garde en fallback de secours, pas un vrai remplacement.
            ModelChoice(Provider.WHISPER_LOCAL.value, "large-v3", valide_reel=True, nb_cas_reels=15),
            ModelChoice(Provider.OPENAI.value, "whisper-1", valide_reel=False, nb_cas_reels=0),
        ],
    ),
}


def _parser_override_env(nom_variable: str) -> Optional[ModelChoice]:
    """
    Lit une variable d'environnement au format 'provider:model_name' et la
    transforme en ModelChoice. Retourne None si la variable n'est pas definie.
    """
    valeur = os.getenv(nom_variable)
    if not valeur:
        return None
    if ":" not in valeur:
        raise ValueError(
            f"{nom_variable} doit etre au format 'provider:model_name' "
            f"(ex: 'openai:gpt-4o-mini'), recu : {valeur!r}"
        )
    provider, model_name = valeur.split(":", 1)
    # Un override manuel est suppose intentionnel -- on ne peut pas garantir
    # qu'il a ete valide reellement, donc valide_reel=False par prudence,
    # sauf a documenter explicitement le contraire ailleurs.
    return ModelChoice(provider=provider.strip(), model_name=model_name.strip(), valide_reel=False, nb_cas_reels=0)


_ENV_VAR_PAR_MODALITE = {
    Modality.TEXT: "TEXTE_MODEL",
    Modality.VISION: "VISION_MODEL",
    Modality.TRANSCRIPTION: "VOCAL_MODEL",
}


def get_config(modality: Modality) -> ModalityConfig:
    """
    Retourne la configuration active (principal + fallbacks) pour une
    modalite donnee. Si la variable d'environnement correspondante est
    definie (TEXTE_MODEL / VISION_MODEL / VOCAL_MODEL), elle remplace le
    choix principal par defaut -- sans toucher au code, conformement a
    l'objectif du ToolRegistry (cahier des charges, section 3.1).
    """
    defaut = _DEFAULT_CONFIG[modality]
    override = _parser_override_env(_ENV_VAR_PAR_MODALITE[modality])
    if override:
        return ModalityConfig(principal=override, fallbacks=defaut.fallbacks)
    return defaut


def resume_configuration() -> str:
    """Petit resume lisible de la configuration active, utile pour verifier au demarrage."""
    lignes = ["=== Configuration ToolRegistry active ==="]
    for modality in Modality:
        cfg = get_config(modality)
        p = cfg.principal
        statut = "VALIDE REEL" if p.valide_reel else "NON VALIDE / THEORIQUE"
        lignes.append(
            f"{modality.value:15} -> {p.provider}:{p.model_name} "
            f"[{statut}, {p.nb_cas_reels} cas reels]"
        )
        for fb in cfg.fallbacks:
            statut_fb = "valide" if fb.valide_reel else "theorique"
            lignes.append(f"{'':15}    fallback -> {fb.provider}:{fb.model_name} ({statut_fb}, {fb.nb_cas_reels} cas)")
    return "\n".join(lignes)


if __name__ == "__main__":
    print(resume_configuration())