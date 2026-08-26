# ArchAI — Analyse Intelligente de Documents BTP

![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?style=flat-square&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100%2B-009688?style=flat-square&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-18%2B-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5%2B-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Status](https://img.shields.io/badge/Statut-Fonctionnel-success?style=flat-square)
![License](https://img.shields.io/badge/Licence-Usage%20Interne-lightgrey?style=flat-square)

> Microservice d'extraction OCR et d'estimation de plans architecturaux pour le secteur du batiment, propulse par l'IA.

---

## Table des matieres

- [Contexte](#contexte)
- [Stack Technique](#stack-technique)
- [Architecture](#architecture)
- [Moteurs OCR disponibles](#moteurs-ocr-disponibles)
- [Endpoints API](#endpoints-api)
- [Prerequis](#prerequis)
- [Installation](#installation)
- [Lancer le projet](#lancer-le-projet)
- [Interface Utilisateur](#interface-utilisateur)
- [Tests](#tests)

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

```
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
|   |   +-- extractors/           # Moteurs OCR
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
```

---

## Moteurs OCR disponibles

| Moteur | Type | Cout | Usage |
|--------|------|------|-------|
| Gemini Pro Vision | Vision IA | Gratuit (tier) | **Recommande** — Factures et Plans |
| Mistral Vision | Vision IA | Payant | Alternative cloud |
| EasyOCR | Local | Gratuit | Offline uniquement |
| Tesseract | Local | Gratuit | Offline uniquement |
| EasyOCR + Groq | Hybride | Gratuit | OCR local + LLM structuration |
| Tesseract + Groq | Hybride | Gratuit | OCR local + LLM structuration |

---

## Endpoints API

| Methode | Route | Description |
|---------|-------|-------------|
| GET | `/` | Health check |
| POST | `/api/ia/ocr-facture` | Extraction d'une facture (PDF/image) |
| POST | `/api/ia/devis-from-plan` | Analyse plan PDF + generation devis |
| GET | `/api/documents` | Liste tous les documents extraits |
| GET | `/api/documents/{id}` | Detail d'un document |
| PATCH | `/api/documents/{id}` | Modifier les champs extraits |
| PATCH | `/api/documents/{id}/statut` | Changer statut (valide/rejete) |
| DELETE | `/api/documents/{id}` | Supprimer un document |
| GET | `/api/documents/{id}/fichier` | Telecharger le fichier original |
| POST | `/api/validation/confirm-expense` | Valider un document + log corrections |
| GET | `/api/validation/metrics` | Statistiques et performances systeme |

---

## Prerequis

Avant de lancer le projet, installez ces 3 logiciels sur votre machine :

### 1. Python 3.10 — 3.12
Telechargez sur https://python.org/downloads/

> **Important** : Cochez **"Add Python to PATH"** lors de l'installation.

### 2. Node.js 18 ou 20+ (LTS)
Telechargez la version LTS sur https://nodejs.org/

### 3. Tesseract OCR
Telechargez l'installeur Windows depuis https://github.com/UB-Mannheim/tesseract/wiki

- Laissez le chemin par defaut : `C:\Program Files\Tesseract-OCR`
- **Crucial** : Lors de l'installation, dans les composants optionnels, cochez le pack de langue **French**. Sans cela, la reconnaissance des textes francais echouera.

> **Note** : EasyOCR (~2 Go de modeles) se telecharge automatiquement au premier appel. C'est normal, cela peut prendre quelques minutes.

---

## Installation

### 1. Configuration des cles API

Copiez `.env.example` en `.env` et renseignez vos cles :

```env
GOOGLE_API_KEY=votre_cle_gemini
MISTRAL_API_KEY=votre_cle_mistral
GROQ_API_KEY=votre_cle_groq
```

### 2. Backend (Python)

Ouvrez un terminal a la **racine du projet** :

```bash
# Creer l'environnement virtuel
python -m venv venv_ocr

# Activer l'environnement (Windows)
.\venv_ocr\Scripts\activate

# Installer toutes les dependances Python
pip install -r requirements.txt
```

### 3. Frontend (React)

Ouvrez un **deuxieme terminal** dans le dossier `frontend` :

```bash
cd frontend
npm install
```

---

## Lancer le projet

Une fois l'installation terminee, lancez les deux serveurs en parallele :

**Terminal 1 — Backend :**
```bash
.\venv_ocr\Scripts\activate
python -m uvicorn app.main:app --reload --port 8000
```

**Terminal 2 — Frontend :**
```bash
cd frontend
npm run dev
```

| Service | URL |
|---------|-----|
| Interface utilisateur | http://localhost:5173 |
| API Backend | http://localhost:8000 |
| Documentation Swagger | http://localhost:8000/docs |

---

## Interface Utilisateur

| Page | Fonctionnalite |
|------|---------------|
| **Hub d'Upload** | Toggle Facture/Plan, selecteur moteur IA, dropzone drag-and-drop |
| **Documents** | Tableau filtrable, lignes cliquables, export Excel/PDF par selection |
| **Validation** | Apercu PDF inline + edition des champs + Confirmer/Rejeter selon statut |
| **Statistiques** | Total docs, temps moyen, taux succes, repartition par moteur |

**Logique d'export Excel (format plat) :**
- Plan valide → 1 ligne par piece/espace
- Facture validee → 1 ligne par produit/service
- Seuls les documents a statut **Valide** peuvent etre exportes
- Factures : export depuis la liste uniquement
- Plans : export depuis la liste et depuis la vue detaillee

---

## Tests

```bash
python -m pytest tests/test_ocr.py -v
```

---

## Licence

Usage interne — Projet de stage 3lm Solutions. Tous droits reserves.