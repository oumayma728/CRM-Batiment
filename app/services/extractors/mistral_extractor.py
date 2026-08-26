"""
Nécessite : pip install mistralai
Nécessite : export MISTRAL_API_KEY=... (clé gratuite depuis console.mistral.ai, tier "Experiment")

Vérifie le nom exact de la méthode (chat.complete vs chat.completions.create selon la
version du SDK) et le nom du modèle courant dans la doc si ça échoue avec une erreur
d'attribut -- le SDK Mistral a changé plusieurs fois sa forme, comme beaucoup d'autres cette année.
"""
import base64
import io
import json
import os
import time

from PIL import Image

from .base import BaseExtractor, ExtractionResult
from .pdf_utils import pdf_to_images
from .gemini_extractor import PROMPT


class MistralExtractor(BaseExtractor):
    name = "mistral-large-latest"

    def __init__(self, model_name: str = None):
        from mistralai.client import Mistral
        self.client = Mistral(api_key=os.environ["MISTRAL_API_KEY"])
        if model_name:
            self.name = model_name

    def extract(self, pdf_path: str) -> ExtractionResult:
        start = time.time()
        try:
            images = pdf_to_images(pdf_path)
            image_b64 = self._to_base64(images[0])  # 1re page, suffisant pour une facture

            response = self.client.chat.complete(
                model=self.name,
                messages=[{
                    "role": "user",
                    "content": [
                        {"type": "text", "text": PROMPT},
                        {"type": "image_url", "image_url": f"data:image/png;base64,{image_b64}"},
                    ],
                }],
                response_format={"type": "json_object"},
            )
            elapsed = time.time() - start

            text = response.choices[0].message.content.strip()
            if text.startswith("```"):
                text = text.strip("`")
                text = text[4:] if text.lower().startswith("json") else text
            data = json.loads(text)

            usage = response.usage
            in_tok = getattr(usage, "prompt_tokens", 0) if usage else 0
            out_tok = getattr(usage, "completion_tokens", 0) if usage else 0

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
                cost_estimate_eur=0.0,  # tier gratuit
            )
        except Exception as e:
            return ExtractionResult(error=f"{type(e).__name__}: {e}", elapsed_seconds=time.time() - start)

    @staticmethod
    def _to_base64(image_array) -> str:
        img = Image.fromarray(image_array)
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return base64.b64encode(buf.getvalue()).decode()
