import os
import sys
import json

# Add backend dir to path so we can import app modules
sys.path.append(r"c:\Users\Oahma\Downloads\files (2)")

from app.services.extractors.gemini_plan_extractor import GeminiPlanExtractor

# Load env variables (assume .env exists)
from dotenv import load_dotenv
load_dotenv(r"c:\Users\Oahma\Downloads\files (2)\.env")

def test():
    pdf_path = r"C:\Users\Oahma\Downloads\files (2)\Plans\APS RIAD FINAL.pdf"
    extractor = GeminiPlanExtractor()
    print("Extracting...")
    result = extractor.extract(pdf_path)
    
    if result.error:
        print("ERROR:", result.error)
    else:
        print("SUCCESS!")
        print(json.dumps({"pieces": result.pieces, "total_surface": result.surface_totale_m2}, indent=2))

if __name__ == "__main__":
    test()
