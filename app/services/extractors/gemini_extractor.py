"""
Nécessite : pip install google-generativeai
Nécessite : export GOOGLE_API_KEY=... (clé gratuite depuis aistudio.google.com)

NB: le SDK Google évolue vite (google-generativeai -> google-genai) —
si `import google.generativeai` échoue, vérifie le nom du package actuel
sur https://ai.google.dev/gemini-api/docs avant de debugger autre chose.
"""
"""
Nécessite : pip install google-genai
Nécessite : export GOOGLE_API_KEY=... (clé gratuite depuis aistudio.google.com)
"""
import json
import os
import time

from .base import BaseExtractor, ExtractionResult

PROMPT = """Tu es un moteur d'extraction de données de factures BTP.
Analyse cette facture et réponds UNIQUEMENT avec un objet JSON valide (aucun texte
avant/après, aucun bloc markdown), avec exactement ces clés :

{
  "date_facture": "JJ/MM/AAAA",
  "numero_facture": "string tel qu'écrit sur la facture",
  "nom_fournisseur": "string",
  "montant_ht": nombre (total HT, toutes lignes et tous taux de TVA confondus),
  "montant_tva": nombre (total TVA, tous taux confondus),
  "montant_ttc": nombre (total à payer),
  "produits": ["designation ligne 1", "designation ligne 2", ...]
}

Si un champ est illisible ou absent, mets null. Ne fais aucun calcul non demandé,
recopie les totaux tels qu'affichés sur le document."""


class GeminiExtractor(BaseExtractor):
    name = "gemini-3.5-flash"  # 2.5-flash / 2.5-flash-lite bloqués pour les nouvelles clés

    def __init__(self, model_name: str = None):
        from google import genai
        self.client = genai.Client(api_key=os.environ["GOOGLE_API_KEY"])
        if model_name:
            self.name = model_name

    def extract(self, pdf_path: str) -> ExtractionResult:
        start = time.time()
        try:
            uploaded = self.client.files.upload(file=pdf_path)
            response = self.client.models.generate_content(
                model=self.name,
                contents=[uploaded, PROMPT],
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

            # Score de confiance heuristique par champ
            confidence = {}
            for field_name in ["date_facture", "numero_facture", "nom_fournisseur",
                               "montant_ht", "montant_tva", "montant_ttc"]:
                val = data.get(field_name)
                confidence[field_name] = 1.0 if val is not None else 0.0

            return ExtractionResult(
                date_facture=data.get("date_facture"),
                numero_facture=data.get("numero_facture"),
                nom_fournisseur=data.get("nom_fournisseur"),
                montant_ht=data.get("montant_ht"),
                montant_tva=data.get("montant_tva"),
                montant_ttc=data.get("montant_ttc"),
                produits=data.get("produits") or [],
                raw_response=response.text,
                elapsed_seconds=elapsed,
                input_tokens=in_tok,
                output_tokens=out_tok,
                cost_estimate_eur=0.0,
                confidence_scores=confidence,
            )
        except Exception as e:
            return ExtractionResult(error=f"{type(e).__name__}: {e}", elapsed_seconds=time.time() - start)