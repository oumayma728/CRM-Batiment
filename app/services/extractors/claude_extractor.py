"""Nécessite : pip install anthropic + export ANTHROPIC_API_KEY=...
À VÉRIFIER avant de lancer : le nom du modèle courant sur https://docs.claude.com
(Claude 3.5 Sonnet daté dans le CDC n'est probablement plus le modèle le plus récent —
teste avec la génération actuelle et note le remplacement dans ton rapport)."""
import base64
import json
import time
from .base import BaseExtractor, ExtractionResult
from .gemini_extractor import PROMPT

PRICING_PER_1M_TOKENS_USD = {"input": 3.00, "output": 15.00}  # à réajuster, cf. docs.claude.com/pricing
USD_TO_EUR = 0.92


class ClaudeExtractor(BaseExtractor):
    name = "claude-sonnet-4-6"  # ajuste au modèle réellement disponible sur ta clé

    def __init__(self, model_name: str = None):
        import anthropic
        self.client = anthropic.Anthropic()  # lit ANTHROPIC_API_KEY automatiquement
        if model_name:
            self.name = model_name

    def extract(self, pdf_path: str) -> ExtractionResult:
        start = time.time()
        try:
            with open(pdf_path, "rb") as f:
                b64 = base64.b64encode(f.read()).decode()

            response = self.client.messages.create(
                model=self.name,
                max_tokens=1024,
                messages=[{
                    "role": "user",
                    "content": [
                        {"type": "document", "source": {"type": "base64", "media_type": "application/pdf", "data": b64}},
                        {"type": "text", "text": PROMPT},
                    ],
                }],
            )
            elapsed = time.time() - start
            text = "".join(b.text for b in response.content if b.type == "text").strip()
            if text.startswith("```"):
                text = text.strip("`")
                text = text[4:] if text.lower().startswith("json") else text
            data = json.loads(text)

            in_tok = response.usage.input_tokens
            out_tok = response.usage.output_tokens
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
