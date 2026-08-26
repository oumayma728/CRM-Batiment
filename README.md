# ArchAI — Analyse Intelligente de Documents BTP

> Microservice d'extraction OCR et d'estimation de plans architecturaux pour le secteur du batiment.

---

## Contexte

Les entreprises de batiment recoivent chaque jour de nombreuses factures fournisseurs et plans techniques. ArchAI automatise leur traitement grace a l'OCR combine a l'IA, permettant une extraction structuree et une validation humaine integree.

---

## Stack Technique

| Couche | Technologie | Justification |
|--------|------------|---------------|
| **Backend** | FastAPI (Python 3.12) | Framework async haute performance, auto-doc Swagger |
| **Frontend** | React 18 + TypeScript + Vite | SPA moderne, typage fort, build rapide |
| **Design System** | Tailwind CSS v4 | Design tokens Obsidian Dark Mode |
| **Base de donnees** | SQLAlchemy + SQLite | Leger, zero-configuration |
| **Export Excel** | ExcelJS | En-tetes couleur, lignes alternees, AutoFilter |
| **Export PDF** | jsPDF + jspdf-autotable | Generation PDF cote client |
| **OCR Principal** | Gemini Pro Vision | Meilleur rapport qualite/cout, extraction JSON native |
| **OCR Alternatif** | Mistral Vision | Vision multimodal, alternative cloud |
| **OCR Local** | EasyOCR, Tesseract | Gratuit, aucune dependance cloud |
| **OCR Hybride** | EasyOCR/Tesseract + Groq | OCR local + structuration par LLM gratuit |

---

## Architecture

`
archai/
|
+-- .env.example                  # Template des variables d'environnement
+-- requirements.txt              # Dependances Python
+-- README.md                     # Ce fichier
|
+-- app/                          # Backend FastAPI
|   +-- main.py                   # Point d'entree, CORS, routers
|   +-- config.py                 # Variables d'environnement (.env)
|   +-- database.py               # SQLAlchemy + SQLite
|   +-- models/
|   |   +-- facture_models.py     # Modeles Pydantic + SQLAlchemy
|   |   +-- plan_models.py
|   +-- routes/
|   |   +-- ocr_facture_routes.py # POST /api/ia/ocr-facture
|   |   +-- plan_routes.py        # POST /api/ia/devis-from-plan
|   |   +-- documents_routes.py   # CRUD documents
|   |   +-- validation_routes.py  # Validation humaine + metriques
|   +-- services/
|   |   +-- extractor_registry.py
|   |   +-- ocr_facture_service.py
|   |   +-- devis_generation_service.py
|   |   +-- extractors/           # Moteurs OCR (voir section dediee)
|   +-- utils/
|       +-- filename_utils.py
|       +-- file_validation_utils.py
|       +-- logger.py
|       +-- metrics.py
|
+-- frontend/                     # Frontend React + TypeScript
|   +-- src/
|   |   +-- components/           # UploadZone, ValidationPanel, DocumentsTable,
|   |   |                         # ExportBar, FieldCard, StatusBadge, Sidebar
|   |   +-- pages/                # UploadPage, DocumentsPage, ValidationPage, MetricsPage
|   |   +-- services/             # ocrApi.ts, documentsApi.ts, validationApi.ts
|   |   +-- lib/                  # export-excel.ts, export-pdf.ts, devisUtils.ts
|   |   +-- types/                # index.ts
|   |   +-- index.css             # Design tokens @theme
|   +-- package.json
|   +-- vite.config.ts
|
+-- tests/
|   +-- test_ocr.py               # Tests unitaires
|
+-- results/                      # Resultats benchmark CSV par moteur
+-- ground_truth.json             # Verite terrain factures
+-- ground_truth_plans.json       # Verite terrain plans
+-- rapport/                      # Documentation technique par ticket
`

---

## Moteurs OCR disponibles

| Moteur | Type | Cout | Usage |
|--------|------|------|-------|
| Gemini Pro Vision | Vision IA | Gratuit (tier) | **Recommande** Factures et Plans |
| Mistral Vision | Vision IA | Payant | Alternative cloud |
| EasyOCR | Local | Gratuit | Offline uniquement |
| Tesseract | Local | Gratuit | Offline uniquement |
| EasyOCR + Groq | Hybride | Gratuit | OCR local + LLM structuration |
| Tesseract + Groq | Hybride | Gratuit | OCR local + LLM structuration |

---

## Endpoints API

| Methode | Route | Description |
|---------|-------|-------------|
| GET | / | Health check |
| POST | /api/ia/ocr-facture | Extraction d'une facture (PDF/image) |
| POST | /api/ia/devis-from-plan | Analyse plan PDF + generation devis |
| GET | /api/documents | Liste tous les documents extraits |
| GET | /api/documents/{id} | Detail d'un document |
| PATCH | /api/documents/{id} | Modifier les champs |
| PATCH | /api/documents/{id}/statut | Changer statut (valide/rejete) |
| DELETE | /api/documents/{id} | Supprimer un document |
| GET | /api/documents/{id}/fichier | Telecharger le fichier original |
| POST | /api/validation/confirm-expense | Valider un document + log corrections |
| GET | /api/validation/metrics | Statistiques et performances systeme |

---

## Installation

### Prerequis systeme (a installer une seule fois)

Avant de faire quoi que ce soit, installez ces 3 logiciels :

#### 1. Python 3.10 a 3.12
Telechargez sur https://python.org/downloads/
**Important** : Cochez "Add Python to PATH" lors de l'installation.

#### 2. Node.js 18 ou 20+ (LTS)
Telechargez sur https://nodejs.org/ (version LTS recommandee).

#### 3. Tesseract OCR (moteur local)
Telechargez l'installeur Windows : https://github.com/UB-Mannheim/tesseract/wiki
- Laissez le chemin par defaut : C:\Program Files\Tesseract-OCR
- **Crucial** : Pendant l'installation, dans "Additional language data", **cochez "French"**.
  Sans cela, la reconnaissance des factures francaises echouera.

> Note : EasyOCR telecharge ses modeles (~2 Go) automatiquement lors du premier appel.
> C'est normal, cela peut prendre plusieurs minutes.

---

### Configuration des cles API

Copiez le fichier .env.example en .env et remplissez vos cles :

`
GOOGLE_API_KEY=votre_cle_gemini
MISTRAL_API_KEY=votre_cle_mistral
GROQ_API_KEY=votre_cle_groq
`

---

### Backend (Python)

Ouvrez un terminal a la **racine du projet** :

`ash
# 1. Creer l'environnement virtuel
python -m venv venv_ocr

# 2. Activer l'environnement (Windows)
.\venv_ocr\Scripts\activate

# 3. Installer toutes les dependances Python
pip install -r requirements.txt

# 4. Lancer le serveur
python -m uvicorn app.main:app --reload --port 8000
`

Le backend est accessible sur : http://localhost:8000
Documentation Swagger : http://localhost:8000/docs

---

### Frontend (React)

Ouvrez un **deuxieme terminal** dans le dossier rontend :

`ash
cd frontend

# 1. Installer toutes les dependances Node.js
#    Cela installe : React, Vite, Tailwind CSS, ExcelJS, jsPDF, etc.
npm install

# 2. Lancer le serveur de developpement
npm run dev
`

L'interface est accessible sur : http://localhost:5173

---

### Lancer apres la premiere installation

Une fois les installations faites, vous n'avez plus besoin de les refaire.
Pour relancer le projet :

**Terminal 1 (Backend) :**
`ash
.\venv_ocr\Scripts\activate
python -m uvicorn app.main:app --reload --port 8000
`

**Terminal 2 (Frontend) :**
`ash
cd frontend
npm run dev
`

---

## Interface Utilisateur

| Page | Fonctionnalite |
|------|---------------|
| **Hub d'Upload** | Toggle Facture/Plan, selecteur moteur IA, dropzone drag-and-drop |
| **Documents** | Tableau filtrable, lignes cliquables, export Excel/PDF selectionne |
| **Validation** | PDF inline + edition des champs + Confirmer/Rejeter (selon statut) |
| **Statistiques** | Dashboard : total docs, temps moyen, taux succes, repartition moteur |

### Logique d'export Excel

- **Format plat** : 1 ligne = 1 piece (plan) ou 1 produit (facture)
- **Export selectif** : depuis la liste, uniquement les documents Valides selectionnes
- **Plans** : bouton Export aussi disponible dans la vue detaillee du plan (valide)
- **Factures** : export uniquement depuis la liste des documents

---

## Tests

`ash
python -m pytest tests/test_ocr.py -v
`

---

## Critere de succes

> Le systeme permet a un utilisateur d'uploader une facture ou un plan architectural et d'obtenir une extraction structuree fiable, avec validation humaine integree et export Excel en tableau plat exploitable.

**Statut : ATTEINT** -- Fonctionnel pour les deux cas d'usage principaux.
