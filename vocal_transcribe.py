"""
vocal_transcribe.py — Sous-tache 2 (Tache "Composant React VoiceRecorder") :
POST /api/devis/vocal-transcribe -- blob audio en entree, sortie
{transcription_texte, confidence_score, duration_seconds}.

confidence_score est une heuristique construite ici, PAS une valeur
auto-evaluee par Voxtral/Whisper (ces modeles de transcription pure ne
fournissent pas de score de confiance natif, contrairement aux LLM texte/
vision utilises ailleurs dans ce projet -- matching_confidence, etc.).

Heuristique (documentee, ajustable) :
- Base 1.0
- Repetition detectee (meme detection que extraction.py, mode d'echec deja
  documente sur Whisper local pendant le benchmark) -> forte penalite
- Ratio mots/seconde anormalement bas (transcription trop courte pour la
  duree de l'enregistrement) -> penalite moderee
- Transcription vide -> 0.0
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from toolregistry.registry import ToolRegistry

MOTS_PAR_SECONDE_ATTENDU_MIN = 0.8  # en dessous, on suspecte une transcription tronquee/incomplete


@dataclass
class VocalTranscriptionResultat:
    transcription_texte: str
    confidence_score: float
    duration_seconds: float
    provider_utilise: str
    model_utilise: str


def _detecter_repetition(texte: str) -> bool:
    """Meme heuristique que extraction.py -- mode d'echec deja documente (Whisper local, benchmark)."""
    mots = texte.split()
    if len(mots) <= 10:
        return False
    moitie = len(texte) // 2
    premiere_moitie = texte[:moitie].strip()
    return bool(premiere_moitie) and premiere_moitie in texte[moitie:]


def _calculer_confidence(texte: str, duration_seconds: float) -> float:
    if not texte or not texte.strip():
        return 0.0

    confidence = 1.0

    if _detecter_repetition(texte):
        confidence -= 0.5

    nb_mots = len(texte.split())
    if duration_seconds > 0:
        mots_par_seconde = nb_mots / duration_seconds
        if mots_par_seconde < MOTS_PAR_SECONDE_ATTENDU_MIN:
            confidence -= 0.3

    return round(max(0.0, min(1.0, confidence)), 2)


def transcrire_avec_confiance(
    audio_bytes: bytes,
    duration_seconds: float,
    registry: Optional[ToolRegistry] = None,
) -> VocalTranscriptionResultat:
    if registry is None:
        registry = ToolRegistry()

    resultat = registry.transcribe_audio(audio_bytes)
    confidence = _calculer_confidence(resultat.texte, duration_seconds)

    return VocalTranscriptionResultat(
        transcription_texte=resultat.texte,
        confidence_score=confidence,
        duration_seconds=duration_seconds,
        provider_utilise=resultat.provider_utilise,
        model_utilise=resultat.model_utilise,
    )