"""
test_e2e_vision_vocal.py — Sous-tache 3 (Tache Integration ToolRegistry) :
test end-to-end photo + vocal via ToolRegistry.analyze_photo() et
transcribe_audio(), sur 1 photo et 1 audio reels, avec validation des
sorties et mesure de latence.
"""

from __future__ import annotations

import json
from pathlib import Path

from toolregistry.registry import ToolRegistry

PHOTO_TEST = Path("ressources/1.jpeg")
AUDIO_TEST = Path("ressources/1.mp3")


def valider_schema_photo(contenu_json: dict) -> list[str]:
    ecarts = []
    for champ in ["type_piece", "surface_estimee_m2", "materiaux_identifies", "reference_visible_oui_non"]:
        if champ not in contenu_json:
            ecarts.append(f"champ '{champ}' manquant")
    if "materiaux_identifies" in contenu_json and not isinstance(contenu_json["materiaux_identifies"], list):
        ecarts.append("'materiaux_identifies' n'est pas une liste")
    return ecarts


def run_test() -> None:
    registry = ToolRegistry()
    resultats = {}

    # --- PHOTO ---
    print("--- Test PHOTO ---")
    if not PHOTO_TEST.exists():
        print(f"  ECHEC : fichier introuvable ({PHOTO_TEST})")
        resultats["photo"] = {"success": False, "error": f"fichier introuvable : {PHOTO_TEST}"}
    else:
        try:
            image_bytes = PHOTO_TEST.read_bytes()
            resultat = registry.analyze_photo(image_bytes)
            ecarts = valider_schema_photo(resultat.contenu_json)
            schema_valide = len(ecarts) == 0

            print(f"  Provider utilise : {resultat.provider_utilise}:{resultat.model_utilise} (fallback niveau {resultat.fallback_niveau})")
            print(f"  Latence : {resultat.latency_ms:.0f} ms")
            print(f"  Schema JSON valide : {schema_valide}" + (f" -- ecarts: {ecarts}" if ecarts else ""))
            print(f"  Contenu : {json.dumps(resultat.contenu_json, ensure_ascii=False)}")
            if resultat.tentatives_echouees:
                print(f"  Tentatives echouees avant succes : {resultat.tentatives_echouees}")

            resultats["photo"] = {
                "success": True, "provider": resultat.provider_utilise, "model": resultat.model_utilise,
                "fallback_niveau": resultat.fallback_niveau, "latency_ms": resultat.latency_ms,
                "schema_valide": schema_valide, "ecarts_schema": ecarts, "contenu": resultat.contenu_json,
            }
        except Exception as e:
            print(f"  ECHEC TOTAL (tous les fallbacks ont echoue) : {e}")
            resultats["photo"] = {"success": False, "error": str(e)}
    print()

    # --- VOCAL ---
    print("--- Test VOCAL ---")
    if not AUDIO_TEST.exists():
        print(f"  ECHEC : fichier introuvable ({AUDIO_TEST})")
        resultats["vocal"] = {"success": False, "error": f"fichier introuvable : {AUDIO_TEST}"}
    else:
        try:
            audio_bytes = AUDIO_TEST.read_bytes()
            resultat = registry.transcribe_audio(audio_bytes)
            sortie_non_vide = bool(resultat.texte and resultat.texte.strip())

            print(f"  Provider utilise : {resultat.provider_utilise}:{resultat.model_utilise} (fallback niveau {resultat.fallback_niveau})")
            print(f"  Latence : {resultat.latency_ms:.0f} ms")
            print(f"  Sortie non vide : {sortie_non_vide}")
            print(f"  Transcription : {resultat.texte[:200]}")
            if resultat.tentatives_echouees:
                print(f"  Tentatives echouees avant succes : {resultat.tentatives_echouees}")

            resultats["vocal"] = {
                "success": True, "provider": resultat.provider_utilise, "model": resultat.model_utilise,
                "fallback_niveau": resultat.fallback_niveau, "latency_ms": resultat.latency_ms,
                "sortie_non_vide": sortie_non_vide, "transcription": resultat.texte,
            }
        except Exception as e:
            print(f"  ECHEC TOTAL (tous les fallbacks ont echoue) : {e}")
            resultats["vocal"] = {"success": False, "error": str(e)}
    print()

    Path("test_e2e_vision_vocal_resultats.json").write_text(
        json.dumps(resultats, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print("Termine. Resultats sauvegardes dans test_e2e_vision_vocal_resultats.json")


if __name__ == "__main__":
    run_test()