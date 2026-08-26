"""
Extracteur Gemini pour les plans d'architecture.

Nécessite : GOOGLE_API_KEY dans .env
Utilise le SDK google.genai et le modèle gemini-3.5-flash.
"""
import json
import os
import time

from .base import BaseExtractor, PlanExtractionResult

PLAN_PROMPT = """Tu es un expert en extraction de données de plans d'architecture et de permis de construire.
Analyse ce document de plan d'architecture et réponds UNIQUEMENT avec un objet JSON valide (aucun texte avant/après, aucun bloc markdown), avec exactement cette structure :

{
  "pieces": [
    {
      "nom": "nom original de la pièce tel qu'il apparaît sur le plan (ex: SEJOUR/RECEPTION)",
      "niveau": "niveau ou étage (ex: RDC, Étage, Sous-sol), SINON null",
      "categorie": "catégorie de la pièce (ex: Salon, Cuisine, Chambre, Extérieur), SINON null",
      "cotes_originales": ["liste exacte des textes de cotations visibles pour cette pièce, ex: '400', '375'"],
      "longueur_m": nombre en mètres (normalisé depuis les cotes), SINON null,
      "largeur_m": nombre en mètres (normalisé depuis les cotes), SINON null,
      "surface_m2": nombre en m2, SINON null,
      "source_surface": "imprimee" (si lue directement) OU "calculee" (si calculée par toi à partir des dimensions) OU null,
      "methode_calcul": "explication brève du calcul (ex: '4.00 * 3.75') si calculée, SINON null",
      "confiance": nombre entre 0.0 et 1.0 indiquant ta certitude sur l'extraction de cette pièce
    }
  ],
  "surface_totale_m2": nombre (surface totale explicitement imprimée ou somme fiable, SINON null)
}

Règles strictes :
1. DÉTECTION ET SÉPARATION : Extrais toutes les pièces et zones physiques (intérieur, extérieur, dépendances). Ne fusionne JAMAIS deux pièces distinctes même si elles ont le même nom. Le 'niveau' est obligatoire si déterminable. Conserve les noms originaux.
2. UNITÉS ET NORMALISATION : Détermine l'unité du plan (ex: cm). Si une cote est '400' en cm, 'longueur_m' doit être 4.00. Ne suppose pas aveuglément que c'est en mètres. Si l'unité est incertaine, mets null.
3. CALCUL DES SURFACES : 
   - Cas 1: Si la surface est explicitement imprimée sur le plan, utilise-la ('source_surface' = "imprimee").
   - Cas 2: Si la surface n'est pas indiquée, MAIS que les cotes sont lisibles (longueur et largeur), tu DOIS la calculer mathématiquement (L x l). ('source_surface' = "calculee", indique la formule dans 'methode_calcul').
4. INTERDICTION D'INVENTER : N'estime jamais une dimension visuellement/graphiquement en utilisant l'échelle de l'image. L'échelle sert à interpréter le contexte, pas à fabriquer une cote manquante. Si des informations manquent pour calculer la surface, mets 'surface_m2': null et 'source_surface': null. MIEUX VAUT 'null' QU'UNE VALEUR INVENTÉE.
5. ANALYSE GLOBALE : Analyse l'ensemble du document (tous les niveaux) pour ne rien rater."""


class GeminiPlanExtractor(BaseExtractor):
    name = "gemini-3.5-flash"

    def __init__(self, model_name: str = None):
        from google import genai
        self.client = genai.Client(api_key=os.environ["GOOGLE_API_KEY"])
        if model_name:
            self.name = model_name

    def extract_plan(self, pdf_path: str) -> PlanExtractionResult:
        start = time.time()
        try:
            uploaded = self.client.files.upload(file=pdf_path)
            response = self.client.models.generate_content(
                model=self.name,
                contents=[uploaded, PLAN_PROMPT],
            )
            elapsed = time.time() - start

            text = response.text.strip()
            if text.startswith("```"):
                text = text.strip("`")
                text = text[4:] if text.lower().startswith("json") else text
            data = json.loads(text)

            usage = getattr(response, "usage_metadata", None)
            in_tok = getattr(usage, "prompt_token_count", 0) if usage else 0
            out_tok = getattr(usage, "candidates_token_count", 0) if usage else 0

            return PlanExtractionResult(
                pieces=data.get("pieces") or [],
                surface_totale_m2=data.get("surface_totale_m2"),
                raw_response=response.text,
                elapsed_seconds=elapsed,
                input_tokens=in_tok,
                output_tokens=out_tok,
                cost_estimate_eur=0.0,
            )
        except Exception as e:
            return PlanExtractionResult(error=f"{type(e).__name__}: {e}", elapsed_seconds=time.time() - start)

    def extract(self, pdf_path: str) -> PlanExtractionResult:
        return self.extract_plan(pdf_path)
