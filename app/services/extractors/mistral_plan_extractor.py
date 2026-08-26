"""
Extracteur Mistral pour les plans d'architecture.

Nécessite : MISTRAL_API_KEY dans .env
Convertit toutes les pages du plan PDF en images PNG et les envoie à Mistral Large.
"""
import base64
import io
import json
import os
import time

from PIL import Image

from .base import BaseExtractor, PlanExtractionResult
from .pdf_utils import pdf_to_images
from .gemini_plan_extractor import PLAN_PROMPT


class MistralPlanExtractor(BaseExtractor):
    name = "mistral-large-latest"

    def __init__(self, model_name: str = None):
        from mistralai.client import Mistral
        self.client = Mistral(api_key=os.environ["MISTRAL_API_KEY"])
        if model_name:
            self.name = model_name

    def extract_plan(self, pdf_path: str) -> PlanExtractionResult:
        start = time.time()
        try:
            images = pdf_to_images(pdf_path)
            content_payload = [{"type": "text", "text": PLAN_PROMPT}]

            # Convertir chaque page du plan PDF en image Base64
            for img in images:
                image_b64 = self._to_base64(img)
                content_payload.append({
                    "type": "image_url",
                    "image_url": f"data:image/png;base64,{image_b64}"
                })

            response = self.client.chat.complete(
                model=self.name,
                messages=[{
                    "role": "user",
                    "content": content_payload,
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

            return PlanExtractionResult(
                pieces=data.get("pieces") or [],
                surface_totale_m2=data.get("surface_totale_m2"),
                raw_response=text,
                elapsed_seconds=elapsed,
                input_tokens=in_tok,
                output_tokens=out_tok,
                cost_estimate_eur=0.0,
            )
        except Exception as e:
            return PlanExtractionResult(error=f"{type(e).__name__}: {e}", elapsed_seconds=time.time() - start)

    def extract(self, pdf_path: str) -> PlanExtractionResult:
        return self.extract_plan(pdf_path)

    @staticmethod
    def _to_base64(image_array) -> str:
        img = Image.fromarray(image_array)
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return base64.b64encode(buf.getvalue()).decode()
