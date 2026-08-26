import os
import time
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

FACTURES_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'Facture')
PLANS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'Plans')
REPORT_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'rapport', 'rapport_validation_e2e.md')

def get_test_files():
    factures = []
    plans = []
    
    if os.path.exists(FACTURES_DIR):
        for f in os.listdir(FACTURES_DIR):
            if f.lower().endswith(('.pdf', '.jpg', '.png', '.jpeg')):
                factures.append(os.path.join(FACTURES_DIR, f))
                
    if os.path.exists(PLANS_DIR):
        for f in os.listdir(PLANS_DIR):
            if f.lower().endswith(('.pdf', '.jpg', '.png', '.jpeg')):
                plans.append(os.path.join(PLANS_DIR, f))
                
    # Limit to up to 10 each for the test, plus we'll simulate 1 bad file
    return factures[:10], plans[:10]

def run_tests():
    print("Démarrage des tests E2E...")
    factures, plans = get_test_files()
    
    results = []
    
    # Test Factures
    for fpath in factures:
        print(f"Testing facture: {os.path.basename(fpath)}")
        start = time.time()
        with open(fpath, "rb") as f:
            # We use gemini which is default, or a fast one. We will use dummy tech if we want to bypass real API calls
            # but to respect the user instruction, we use the default (which uses the real api)
            response = client.post("/api/ia/ocr-facture", files={"file": (os.path.basename(fpath), f, "application/pdf")})
        elapsed = time.time() - start
        
        results.append({
            "type": "facture",
            "file": os.path.basename(fpath),
            "status_code": response.status_code,
            "success": response.status_code == 200,
            "time": elapsed
        })

    # Test Plans
    for ppath in plans:
        print(f"Testing plan: {os.path.basename(ppath)}")
        start = time.time()
        with open(ppath, "rb") as f:
            response = client.post("/api/ia/devis-from-plan", files={"file": (os.path.basename(ppath), f, "application/pdf")})
        elapsed = time.time() - start
        
        results.append({
            "type": "plan",
            "file": os.path.basename(ppath),
            "status_code": response.status_code,
            "success": response.status_code == 200,
            "time": elapsed
        })
        
    # Test Bad File
    print("Testing bad file...")
    start = time.time()
    response = client.post("/api/ia/ocr-facture", files={"file": ("bad.txt", b"not a pdf", "text/plain")})
    elapsed = time.time() - start
    results.append({
        "type": "invalid",
        "file": "bad.txt",
        "status_code": response.status_code,
        "success": response.status_code == 400, # Expected to fail with 400
        "time": elapsed
    })
    
    # Generate Report
    successes = sum(1 for r in results if r["success"])
    total = len(results)
    avg_time = sum(r["time"] for r in results) / total if total > 0 else 0
    
    report = f'''# Rapport de Validation E2E (#2980)

## Résumé
- **Documents testés** : {total}
- **Taux de succès** : {(successes/total*100):.1f}% ({successes}/{total})
- **Latence moyenne** : {avg_time:.2f}s

## Détails des exécutions
| Fichier | Type | Status Code | Succès Attendu | Temps (s) |
|---------|------|-------------|----------------|-----------|
'''
    for r in results:
        status_icon = "✅" if r["success"] else "❌"
        report += f"| {r['file']} | {r['type']} | {r['status_code']} | {status_icon} | {r['time']:.2f} |\n"
        
    with open(REPORT_FILE, "w", encoding="utf-8") as rf:
        rf.write(report)
        
    print(f"Tests terminés. Rapport généré dans {REPORT_FILE}")

if __name__ == "__main__":
    run_tests()
