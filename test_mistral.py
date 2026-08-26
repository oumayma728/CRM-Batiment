import os
import sys
import json

# Add backend dir to path so we can import app modules
sys.path.append(r"c:\Users\Oahma\Downloads\files (2)")

from app.services.extractors.mistral_plan_extractor import MistralPlanExtractor

# Load env variables
from dotenv import load_dotenv
load_dotenv(r"c:\Users\Oahma\Downloads\files (2)\.env")

def test():
    pdf_path = r"C:\Users\Oahma\Downloads\files (2)\Plans\APS RIAD FINAL.pdf"
    extractor = MistralPlanExtractor()
    print("Extracting with Mistral...")
    result = extractor.extract(pdf_path)
    
    if result.error:
        print("ERROR:", result.error)
    else:
        print("SUCCESS!")
        print("RAW RESPONSE:")
        print(result.raw_response)
        print("PARSED PIECES COUNT:", len(result.pieces))

if __name__ == "__main__":
    test()
