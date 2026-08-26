"""Nécessite : pip install openai + export OPENAI_API_KEY=...
Coût non nul — voir estimate_cost_eur() plus bas, à ajuster avec le tarif en vigueur
sur https://openai.com/api/pricing le jour du test."""
import base64
import json
import time
from .base import BaseExtractor, ExtractionResult
from .gemini_extractor import PROMPT  # même prompt pour comparer équitablement

# À VÉRIFIER avant de lancer : tarifs $/1M tokens (input, output). Mets à jour depuis
# la page pricing officielle — les prix ci-dessous sont un exemple, pas une garantie.
PRICING_PER_1M_TOKENS_USD = {"input": 2.50, "output": 10.00}
USD_TO_EUR = 0.92  # taux approximatif, ajuste si besoin


class OpenAIExtractor(BaseExtractor):
    name = "gpt-4o"

    def __init__(self, model_name: str = None):
        from openai import OpenAI
        self.client = OpenAI()  # lit OPENAI_API_KEY automatiquement
        if model_name:
            self.name = model_name

    def extract(self, pdf_path: str) -> ExtractionResult:
        start = time.time()
        try:
            with open(pdf_path, "rb") as f:
                b64 = base64.b64encode(f.read()).decode()

            response = self.client.chat.completions.create(
                model=self.name,
                messages=[{
                    "role": "user",
                    "content": [
                        {"type": "text", "text": PROMPT},
                        {"type": "file", "file": {"filename": pdf_path.split("/")[-1],
                                                    "file_data": f"data:application/pdf;base64,{b64}"}},
                    ],
                }],
                response_format={"type": "json_object"},
            )
            elapsed = time.time() - start
            text = response.choices[0].message.content
            data = json.loads(text)

            in_tok = response.usage.prompt_tokens
            out_tok = response.usage.completion_tokens
            cost_usd = (in_tok / 1_000_000 * PRICING_PER_1M_TOKENS_USD["input"]
                        + out_tok / 1_000_000 * PRICING_PER_1M_TOKENS_USD["output"])

            return ExtractionResult(
                date_facture=data.get("date_facture"),
                numero_facture=data.get("numero_facture"),
                nom_fournisseur=data.get("nom_fournisseur"),
                montant_ht=data.get("montant_ht"),
                montant_tva=data.get("montant_tva"),
                montant_ttc=data.get("montant_ttc"),
                produits=data.get("produits") or [],
                raw_response=text,
                elapsed_seconds=elapsed,
                input_tokens=in_tok,
                output_tokens=out_tok,
                cost_estimate_eur=round(cost_usd * USD_TO_EUR, 5),
            )
        except Exception as e:
            return ExtractionResult(error=f"{type(e).__name__}: {e}", elapsed_seconds=time.time() - start)
