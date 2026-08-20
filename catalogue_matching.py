"""
catalogue_matching.py — Matching description libre -> SKUs catalogue
(Tache "Matching catalogue", cahier des charges section 4.1 et 4.3).

Approche retenue : few-shot / context-stuffing (catalogue entier, 40 lignes,
directement dans le system prompt) plutot qu'un vrai RAG (base vectorielle).
Justification : a cette taille de catalogue (40 lignes), un RAG ajouterait
de la complexite (embeddings, base vectorielle, recherche approximative)
sans benefice reel -- tout le catalogue tient largement dans un prompt.
Correspond aussi a l'exigence du cahier des charges section 4.3 : "Le
catalogue doit figurer dans le system prompt pour beneficier du caching
automatique (economie estimee 60-80%)".

Choix de conception important : le modele NE CALCULE PAS le prix. Il choisit
uniquement le SKU le plus pertinent, estime une quantite, et donne une
confiance de matching. Le prix unitaire et le sous-total sont calcules
deterministement par CE module a partir du vrai catalogue -- aucune
hallucination de prix possible, contrairement a une approche qui laisserait
le modele generer aussi les montants.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

from toolregistry.registry import ToolRegistry, DevisResult
from toolregistry.base import ProviderCallError


@dataclass
class LigneMatching:
    sku_catalogue: Optional[str]
    label_prestation: str
    quantite_estimee: float
    unite: str
    prix_unitaire: Optional[float]
    sous_total: Optional[float]
    matching_confidence: float  # 0.0-1.0, auto-evalue par le modele -- PAS une probabilite calibree
    non_trouve_dans_catalogue: bool = False


def charger_catalogue(chemin: Path = Path("catalogue.json")) -> list[dict]:
    return json.loads(chemin.read_text(encoding="utf-8"))


def _construire_system_prompt(catalogue: list[dict]) -> str:
    lignes_catalogue = "\n".join(
        f"- {item['sku']} | {item['prestation']} | unite: {item['unite']} | prix HT: {item['prix_ht_eur']}€"
        for item in catalogue
    )

    # Few-shot : exemples reels, verifies manuellement sur ce projet (cf.
    # tests du endpoint /api/devis/match-catalogue), choisis pour ancrer
    # deux comportements cles : (1) matching multi-lignes correct, et
    # (2) gestion explicite d'un besoin hors catalogue (sku_catalogue: null,
    # jamais invente, jamais omis silencieusement).
    exemples_few_shot = """Exemples de matching attendu :

Exemple 1 -- plusieurs prestations, toutes dans le catalogue :
Description : "isolation des combles sur 80m2 et remplacement de 3 fenetres en PVC"
Reponse attendue :
{
  "matches": [
    {"sku_catalogue": "BAT-002", "label_prestation": "Isolation des combles perdus", "quantite_estimee": 80, "matching_confidence": 1.0},
    {"sku_catalogue": "BAT-009", "label_prestation": "Remplacement fenetre PVC double vitrage", "quantite_estimee": 3, "matching_confidence": 1.0}
  ]
}

Exemple 2 -- une prestation absente du catalogue (piscine) : NE JAMAIS inventer
de SKU, NE JAMAIS omettre le besoin -- le documenter avec sku_catalogue null :
Description : "peinture interieure sur 40m2 et installation d'une piscine enterree de 30m2"
Reponse attendue :
{
  "matches": [
    {"sku_catalogue": "BAT-029", "label_prestation": "Peinture interieure", "quantite_estimee": 40, "matching_confidence": 1.0},
    {"sku_catalogue": null, "label_prestation": "Installation d'une piscine enterree de 30m2", "quantite_estimee": 1, "matching_confidence": 0.0}
  ]
}

Exemple 3 -- besoin reel mais AUCUNE dimension fournie et PLUSIEURS sous-types
possibles (isolation murs/toiture/sol/cave) : NE JAMAIS lister toutes les
variantes du catalogue avec une quantite inventee a 0 -- une seule ligne
avec sku_catalogue null, en expliquant ce qui manque pour trancher :
Description : "isolation de panneaux polystyrene, surface non determinee"
Reponse attendue :
{
  "matches": [
    {"sku_catalogue": null, "label_prestation": "Isolation (type de paroi et surface non precises -- combles, murs, toiture ou sol a confirmer avant matching)", "quantite_estimee": 0, "matching_confidence": 0.0}
  ]
}"""

    return f"""Tu es un expert en matching de devis BTP vers un catalogue de prestations.

Voici le catalogue complet disponible (SKU | Prestation | Unite | Prix HT) :
{lignes_catalogue}

{exemples_few_shot}

A partir de la description libre fournie par l'utilisateur, identifie les
prestations du catalogue qui correspondent, et estime la quantite necessaire
pour chacune. Reponds UNIQUEMENT en JSON, sans texte autour, avec ce schema :
{{
  "matches": [
    {{
      "sku_catalogue": "BAT-XXX ou null si aucune correspondance",
      "label_prestation": "description de ce que tu as identifie dans le texte",
      "quantite_estimee": <nombre>,
      "matching_confidence": <nombre entre 0.0 et 1.0>
    }},
    ...
  ]
}}

Regles importantes :
- N'invente JAMAIS de SKU qui n'existe pas dans le catalogue ci-dessus.
- Si un besoin decrit n'a AUCUNE correspondance raisonnable dans le catalogue,
  mets "sku_catalogue": null et documente quand meme le besoin dans
  "label_prestation" -- ne l'omets pas silencieusement.
- Si la description ne donne AUCUNE dimension/quantite exploitable ET que
  PLUSIEURS lignes du catalogue pourraient correspondre (ex: type de paroi
  a isoler non precise), NE LISTE PAS toutes les variantes possibles avec
  une quantite a 0 -- une seule ligne avec sku_catalogue null, expliquant
  ce qui manque pour trancher (cf. Exemple 3).
- matching_confidence reflete TA confiance dans la correspondance SKU choisie
  (1.0 = correspondance evidente et directe, 0.0 = aucune certitude) -- pas
  une garantie, juste ton estimation.
- Une description peut correspondre a plusieurs lignes du catalogue (ex: une
  renovation complete peut necessiter plusieurs prestations differentes)."""


def matcher_description_vers_catalogue(
    description_libre: str,
    catalogue_path: Path = Path("catalogue.json"),
    registry: Optional[ToolRegistry] = None,
) -> list[LigneMatching]:
    """
    Fait correspondre une description libre a des lignes du catalogue.
    Utilise ToolRegistry.generate_devis_from_text() en reutilisant sa
    logique de fallback -- mais avec un prompt different (matching, pas
    generation de devis), d'ou l'appel direct au modele plutot que la
    methode generate_devis_from_text() qui a son propre prompt fige.
    """
    catalogue = charger_catalogue(catalogue_path)
    catalogue_index = {item["sku"]: item for item in catalogue}

    system_prompt = _construire_system_prompt(catalogue)

    if registry is None:
        registry = ToolRegistry()

    # Reutilise la chaine de fallback texte du ToolRegistry, mais avec le
    # prompt de matching plutot que celui de generation de devis -- on
    # appelle donc directement le mecanisme sous-jacent via une methode
    # generique, pas generate_devis_from_text() qui a son propre system prompt.
    from toolregistry.config import Modality, get_config
    from toolregistry.registry import _build_text_model, _extraire_json

    cfg = get_config(Modality.TEXT)
    chaine = [cfg.principal] + list(cfg.fallbacks)
    derniere_erreur = None

    contenu_json = None
    for choix in chaine:
        try:
            model = _build_text_model(choix)
            response = model.generate(prompt=description_libre, system_prompt=system_prompt, max_tokens=1200)
            contenu_json = _extraire_json(response.content)
            if contenu_json is not None:
                break
        except (ProviderCallError, ValueError) as e:
            derniere_erreur = e
            continue

    if contenu_json is None:
        raise ProviderCallError("catalogue_matching", f"Aucun provider n'a pu produire un matching valide : {derniere_erreur}")

    lignes: list[LigneMatching] = []
    for match in contenu_json.get("matches", []):
        sku = match.get("sku_catalogue")
        item_catalogue = catalogue_index.get(sku) if sku else None

        quantite = match.get("quantite_estimee", 0) or 0
        try:
            quantite = float(quantite)
        except (TypeError, ValueError):
            quantite = 0.0

        if item_catalogue:
            prix_unitaire = item_catalogue["prix_ht_eur"]
            sous_total = round(prix_unitaire * quantite, 2)
            unite = item_catalogue["unite"]
        else:
            prix_unitaire = None
            sous_total = None
            unite = ""

        lignes.append(LigneMatching(
            sku_catalogue=sku,
            label_prestation=match.get("label_prestation", ""),
            quantite_estimee=quantite,
            unite=unite,
            prix_unitaire=prix_unitaire,
            sous_total=sous_total,
            matching_confidence=float(match.get("matching_confidence", 0.0)),
            non_trouve_dans_catalogue=item_catalogue is None,
        ))

    return lignes