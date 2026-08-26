from dotenv import load_dotenv
load_dotenv()
"""
Usage Factures :
    python run_benchmark.py --technos gemini easyocr mistral --document-type invoice

Usage Plans Architecturaux :
    python run_benchmark.py --technos gemini mistral --document-type plan

Écrit results/<techno>_<type>.csv et affiche une matrice d'évaluation comparative.
"""
import argparse
import csv
import json
import statistics
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from scoring import score_extraction  # noqa: E402
from scoring_plans import score_plan_extraction  # noqa: E402

BASE_DIR = Path(__file__).parent
FACTURES_DIR = BASE_DIR / "Facture"
PLANS_DIR = BASE_DIR / "plan" if (BASE_DIR / "plan").exists() else BASE_DIR / "Plans"
RESULTS_DIR = BASE_DIR / "results"

GROUND_TRUTH_INVOICE_PATH = BASE_DIR / "ground_truth.json"
GROUND_TRUTH_PLAN_PATH = BASE_DIR / "ground_truth_plans.json"

# --- Catégories pour le tableau de sortie ---
CATEGORY_OCR_PUR = "OCR Pur"
CATEGORY_VISION_LLM = "Vision LLM"
CATEGORY_HYBRIDE = "OCR + LLM (Hybride)"

TECHNO_CATEGORIES = {
    "easyocr":        CATEGORY_OCR_PUR,
    "tesseract":      CATEGORY_OCR_PUR,
    "paddleocr":      CATEGORY_OCR_PUR,
    "gemini":         CATEGORY_VISION_LLM,
    "mistral":        CATEGORY_VISION_LLM,
    "gpt-4o":         CATEGORY_VISION_LLM,
    "claude":         CATEGORY_VISION_LLM,
    "easyocr+groq":   CATEGORY_HYBRIDE,
    "tesseract+groq": CATEGORY_HYBRIDE,
    "groq":           CATEGORY_HYBRIDE,
}


def load_extractor(techno: str, doc_type: str = "invoice"):
    from app.services.extractor_registry import get_extractor
    return get_extractor(techno, doc_type)


def resolve_plan_path(source_file: str) -> Path:
    """Résout le chemin du fichier plan indépendamment du nom de dossier ou de casse."""
    filename = Path(source_file).name
    candidates = list(PLANS_DIR.glob("*"))
    for c in candidates:
        if c.name.lower().replace(" ", "_") == filename.lower().replace(" ", "_"):
            return c
    return PLANS_DIR / filename


def run_one_techno_plan(techno: str, ground_truth: list, limit: int = None):
    print(f"\n--- [PLANS] {techno} ---")
    extractor = load_extractor(techno, doc_type="plan")
    entries = ground_truth[:limit] if limit else ground_truth

    rows = []
    for idx, entry in enumerate(entries):
        pdf_path = resolve_plan_path(entry["source_file"])
        if not pdf_path.exists():
            print(f"  [SKIP] fichier introuvable: {pdf_path}")
            continue

        if idx > 0:
            time.sleep(1.5)  # Pause pour éviter les erreurs 429 / 503

        print(f"\n  Extraction de {entry['document_id']} ({pdf_path.name})...")
        result = extractor.extract(str(pdf_path))
        scores = score_plan_extraction(result, entry)

        status = f"ERREUR: {result.error}" if result.error else f"Score global: {scores['overall_accuracy'] * 100:.1f}% (Rappel pièces: {scores['piece_recall']*100:.0f}%, Surface m² ok: {scores['surface_m2_accuracy']*100:.0f}%)"
        print(f"  {entry['document_id']:35s} {result.elapsed_seconds:5.1f}s  {status}")

        if not result.error:
            print(f"    Raw JSON extrait par {techno} :")
            print(f"      - Pièces extraites ({len(result.pieces)}) : {[p.get('nom') for p in result.pieces]}")
            print(f"      - Surface totale m² extraite : {result.surface_totale_m2}")

        rows.append({
            "document_id": entry["document_id"],
            "file": pdf_path.name,
            "elapsed_seconds": round(result.elapsed_seconds, 2),
            "overall_accuracy": round(scores["overall_accuracy"], 3) if not result.error else 0.0,
            "piece_recall": round(scores["piece_recall"], 3) if not result.error else 0.0,
            "piece_precision": round(scores["piece_precision"], 3) if not result.error else 0.0,
            "surface_m2_accuracy": round(scores["surface_m2_accuracy"], 3) if not result.error else 0.0,
            "surface_totale_ok": scores["surface_totale_ok"] if not result.error else False,
            "error": result.error,
        })

    RESULTS_DIR.mkdir(exist_ok=True)
    out_path = RESULTS_DIR / f"plan_{techno.replace('+', '_')}.csv"
    with open(out_path, "w", newline="", encoding="utf-8") as f:
        if rows:
            writer = csv.DictWriter(f, fieldnames=rows[0].keys())
            writer.writeheader()
            writer.writerows(rows)

    # REGLAGE RIGOUREUX : Inclure TOUS les documents tentés (erreurs = 0.0) dans la précision moyenne
    accuracies = [r["overall_accuracy"] for r in rows]
    times = [r["elapsed_seconds"] for r in rows]
    nb_errors = sum(1 for r in rows if r["error"])
    nb_success = len(rows) - nb_errors

    summary = {
        "techno": techno,
        "categorie": TECHNO_CATEGORIES.get(techno, "Vision LLM"),
        "precision_moyenne": round(statistics.mean(accuracies), 3) if accuracies else 0.0,
        "taux_reussite": round(nb_success / len(rows), 3) if rows else 0.0,
        "temps_moyen_s": round(statistics.mean(times), 2) if times else 0.0,
        "cout_total_eur": 0.0,
        "documents_en_erreur": nb_errors,
        "documents_testes": len(rows),
    }
    print(f"  -> {out_path}")
    return summary


import time

def resolve_invoice_path(source_file: str) -> Path:
    """Résout le chemin du fichier facture indépendamment des espaces ou de la casse."""
    filename = Path(source_file).name
    candidates = list(FACTURES_DIR.glob("*"))
    for c in candidates:
        if c.name.lower().replace(" ", "_").replace("(", "").replace(")", "") == filename.lower().replace(" ", "_").replace("(", "").replace(")", ""):
            return c
    return FACTURES_DIR / filename


def run_one_techno_invoice(techno: str, ground_truth: list, limit: int = None):
    print(f"\n--- {techno} ---")
    extractor = load_extractor(techno, doc_type="invoice")
    entries = ground_truth[:limit] if limit else ground_truth
    is_hybrid = TECHNO_CATEGORIES.get(techno) == CATEGORY_HYBRIDE
    is_api_model = techno in ("gemini", "mistral", "gpt-4o", "claude", "easyocr+groq", "tesseract+groq", "groq")

    rows = []
    for idx, entry in enumerate(entries):
        pdf_path = resolve_invoice_path(entry["file"])
        if not pdf_path.exists():
            print(f"  [SKIP] fichier introuvable: {pdf_path}")
            continue

        if is_api_model and idx > 0:
            time.sleep(1.5)  # Pause pour éviter les erreurs 429 Rate Limit de Mistral et 503 de Gemini

        result = extractor.extract(str(pdf_path))
        scores = score_extraction(result, entry)

        status = f"ERREUR: {result.error}" if result.error else f"{scores['field_accuracy'] * 100:.0f}% des champs OK"

        if is_hybrid and not result.error:
            print(f"  {entry['file']:35s} {result.elapsed_seconds:5.1f}s  "
                  f"(OCR {result.ocr_elapsed_seconds:.1f}s + LLM {result.llm_elapsed_seconds:.1f}s)  {status}")
        else:
            print(f"  {entry['file']:35s} {result.elapsed_seconds:5.1f}s  {status}")

        row = {
            "file": entry["file"],
            "elapsed_seconds": round(result.elapsed_seconds, 2),
            "cost_estimate_eur": result.cost_estimate_eur,
            "field_accuracy": round(scores["field_accuracy"], 3) if not result.error else 0.0,
            "date_ok": scores.get("date_facture") if not result.error else False,
            "numero_ok": scores.get("numero_facture") if not result.error else False,
            "fournisseur_ok": scores.get("nom_fournisseur") if not result.error else False,
            "montant_ht_ok": scores.get("montant_ht") if not result.error else False,
            "montant_tva_ok": scores.get("montant_tva") if not result.error else False,
            "montant_ttc_ok": scores.get("montant_ttc") if not result.error else False,
            "error": result.error,
        }
        if is_hybrid:
            row["ocr_elapsed_seconds"] = round(result.ocr_elapsed_seconds, 2)
            row["llm_elapsed_seconds"] = round(result.llm_elapsed_seconds, 2)
        rows.append(row)

    RESULTS_DIR.mkdir(exist_ok=True)
    out_path = RESULTS_DIR / f"{techno.replace('+', '_')}.csv"
    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)

    # REGLAGE RIGOUREUX : Inclure TOUS les documents tentés (erreurs = 0.0) dans la précision moyenne
    accuracies = [r["field_accuracy"] for r in rows]
    times = [r["elapsed_seconds"] for r in rows]
    total_cost = sum(r["cost_estimate_eur"] for r in rows)
    nb_errors = sum(1 for r in rows if r["error"])
    nb_success = len(rows) - nb_errors

    summary = {
        "techno": techno,
        "categorie": TECHNO_CATEGORIES.get(techno, "Autre"),
        "precision_moyenne": round(statistics.mean(accuracies), 3) if accuracies else 0.0,
        "taux_reussite": round(nb_success / len(rows), 3) if rows else 0.0,
        "temps_moyen_s": round(statistics.mean(times), 2) if times else 0.0,
        "cout_total_eur": round(total_cost, 4),
        "documents_en_erreur": nb_errors,
        "documents_testes": len(rows),
    }

    if is_hybrid:
        ocr_times = [r["ocr_elapsed_seconds"] for r in rows if not r["error"]]
        llm_times = [r["llm_elapsed_seconds"] for r in rows if not r["error"]]
        summary["temps_ocr_moyen_s"] = round(statistics.mean(ocr_times), 2) if ocr_times else 0.0
        summary["temps_llm_moyen_s"] = round(statistics.mean(llm_times), 2) if llm_times else 0.0

    print(f"  -> {out_path}")
    return summary


def print_grouped_table(summaries: list, doc_type: str = "invoice"):
    """Affiche le tableau de résultats regroupé par catégorie."""
    print("\n" + "=" * 105)
    print(f"MATRICE D'ÉVALUATION COMPARATIVE ({doc_type.upper()})")
    print("=" * 105)

    print(f"  {'Techno':<20} {'Précision Globale':>18} {'Taux Réussite':>15} {'Temps moy.':>12} {'Erreurs':>9}")
    print("  " + "-" * 78)
    for s in summaries:
        print(f"  {s['techno']:<20} {s['precision_moyenne']*100:>17.1f}% "
              f"{s['taux_reussite']*100:>14.1f}% {s['temps_moyen_s']:>10.2f}s "
              f"{s['documents_en_erreur']:>5}/{s['documents_testes']}")

    print("\n" + "=" * 105)


ALL_CHOICES = [
    "gemini", "easyocr", "paddleocr", "gpt-4o", "claude",
    "tesseract", "mistral", "groq", "easyocr+groq", "tesseract+groq",
]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--technos", nargs="+", required=True, choices=ALL_CHOICES)
    parser.add_argument("--document-type", choices=["invoice", "plan"], default="invoice", help="Type de document (invoice ou plan)")
    parser.add_argument("--limit", type=int, default=None, help="tester sur N documents seulement")
    args = parser.parse_args()

    if args.document_type == "plan":
        ground_truth = json.loads(GROUND_TRUTH_PLAN_PATH.read_text(encoding="utf-8"))
        summaries = [run_one_techno_plan(t, ground_truth, args.limit) for t in args.technos]
    else:
        ground_truth = json.loads(GROUND_TRUTH_INVOICE_PATH.read_text(encoding="utf-8"))
        summaries = [run_one_techno_invoice(t, ground_truth, args.limit) for t in args.technos]

    print_grouped_table(summaries, doc_type=args.document_type)


if __name__ == "__main__":
    main()
