"""
Suite de tests unitaires et de bout en bout pour le microservice OCR (Ticket #2980).

Valide les endpoints OCR factures, estimation plans, validation humaine et devis.
"""
import os
import sys
import unittest
from pathlib import Path
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.main import app
from app.services.devis_generation_service import generate_devis_lines
from app.utils.filename_utils import normalize_filename

client = TestClient(app)


class TestOCRService(unittest.TestCase):

    def test_health_check(self):
        """Vérifie l'endpoint health check GET /."""
        response = client.get("/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ok")

    def test_normalize_filename(self):
        """Vérifie la normalisation des noms de fichiers (anti-doublon)."""
        self.assertEqual(normalize_filename(" Facture  104 (2) .PDF "), "facture 104 (2).pdf")
        self.assertEqual(normalize_filename("APS VILLA _.pdf"), "aps villa _.pdf")
        self.assertEqual(normalize_filename(""), "document")

    def test_devis_generation_service(self):
        """Vérifie la génération automatique de lignes de devis à partir des pièces."""
        pieces = [
            {"nom": "Salon", "surface_m2": 25.0},
            {"nom": "Cuisine", "surface_m2": 12.5},
            {"nom": "WC", "surface_m2": None},  # Pièce sans surface
        ]
        res = generate_devis_lines(pieces)

        # 2 pièces avec surface = 2 lignes de devis
        self.assertEqual(len(res["lignes_devis_proposees"]), 2)
        self.assertEqual(res["lignes_devis_proposees"][0]["designation"], "Carrelage Salon")
        self.assertEqual(res["lignes_devis_proposees"][0]["quantite"], 25.0)

        # 1 pièce sans surface = 1 pièce dans pieces_sans_devis_possible
        self.assertEqual(len(res["pieces_sans_devis_possible"]), 1)
        self.assertEqual(res["pieces_sans_devis_possible"][0]["nom"], "WC")

    def test_invalid_mime_type_upload(self):
        """Vérifie le rejet des types de fichiers non supportés (ex: .txt)."""
        response = client.post(
            "/api/ia/ocr-facture",
            files={"file": ("test.txt", b"Contenu texte invalide", "text/plain")},
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("Type de fichier non supporté", response.json()["detail"])

    def test_unknown_technology(self):
        """Vérifie le rejet d'une technologie inconnue."""
        response = client.post(
            "/api/ia/ocr-facture?technology=techno_inconnue",
            files={"file": ("facture.pdf", b"%PDF-1.4 dummy content", "application/pdf")},
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("Technologie OCR inconnue", response.json()["detail"])

    def test_get_metrics_endpoint(self):
        """Vérifie l'endpoint de métriques et monitoring GET /api/validation/metrics."""
        response = client.get("/api/validation/metrics")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "healthy")
        self.assertIn("total_documents", data)
        self.assertIn("performances", data)


if __name__ == "__main__":
    unittest.main()
