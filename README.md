# Devis IA

Generation assistee par IA de devis pour le batiment (BTP), a partir d'une
description en **texte**, d'une **photo**, ou d'un **message vocal**. Le
document final (`.docx`) est produit a partir d'un catalogue de prestations
reel — les prix ne sont jamais inventes par un modele de langage, seulement
les correspondances catalogue et l'extraction de la demande client.

Projet realise pour 3LM Solutions.

## Comment ca marche

1. **Saisie** — l'utilisateur decrit le besoin de 3 facons possibles :
   - **Texte** : description libre saisie directement.
   - **Photo** : une photo de la piece/du chantier est analysee (type de
     piece, surface estimee, materiaux, detection de flou) pour en extraire
     une description candidate.
   - **Vocal** : un message vocal (enregistre ou importe) est transcrit,
     avec un score de confiance.
2. **Validation** — pour photo et vocal, la description extraite par l'IA
   est **toujours** presentee a l'utilisateur pour relecture/correction
   avant de continuer (jamais de generation automatique a partir d'une
   extraction non verifiee).
3. **Matching catalogue** — la description validee est comparee au
   catalogue de prestations (`catalogue.json`, SKU + prix HT) pour en
   deduire les lignes du devis, quantites et prix.
4. **Generation** — un document `.docx` fidele au format de devis reel de
   l'entreprise est genere (en-tete, tableau des lignes, totaux HT/TVA/TTC)
   et telechargeable depuis l'interface.

Les lignes peuvent aussi etre editees manuellement avant generation finale
(sans nouvel appel IA, calcul purement deterministe).

## Architecture

```
Frontend (React + Vite)  --->  Backend (FastAPI)  --->  ToolRegistry
   devis-frontend/               api.py                 (multi-provider IA)
                                                          toolregistry/
```

- **Backend** — `api.py` (FastAPI) expose les endpoints d'analyse photo,
  transcription vocale, extraction, matching catalogue et generation de
  devis.
- **ToolRegistry** (`toolregistry/`) — couche d'abstraction multi-provider
  IA (Mistral, OpenAI, Anthropic/Claude, Gemini, Whisper local), avec un
  provider **principal** par modalite et une chaine de **fallback**
  configurable sans toucher au code (variables d'environnement ou
  `toolregistry/config.py`). Mistral est le provider principal sur les
  3 modalites (seul provider valide avec des donnees reelles a ce stade).
- **Frontend** (`devis-frontend/`) — React + Vite + Tailwind. Interface a
  onglets (Texte / Photo / Vocal) et ecran d'edition du devis avant
  telechargement.
- **Catalogue** (`catalogue.json`) — reference des prestations (SKU, libelle,
  unite, prix HT) utilisee pour tout calcul de prix (jamais genere par IA).
- **Benchmark / evaluation** (`benchmark/`, `evaluation/`) — scripts de
  comparaison des modeles IA par modalite (WER, exactitude factuelle,
  scoring) sur un jeu de donnees de test (`ressources/`).
- **Tests** (`tests/`) — tests end-to-end du pipeline (texte, photo+vocal,
  robustesse du matching).

## Stack technique

- **Backend** : Python, FastAPI, Pydantic, `python-docx` (generation `.docx`)
- **IA** : Mistral (texte/vision/vocal), avec fallback Gemini / OpenAI /
  Anthropic / Whisper local
- **Frontend** : React 19, Vite, Tailwind CSS

## Demarrage rapide

Voir [USAGE.md](USAGE.md) pour les instructions detaillees d'installation
et d'utilisation (backend + frontend).

```bash
# Backend
pip install -r requirements.txt
cp .env.example .env   # puis renseigner au moins MISTRAL_API_KEY
uvicorn api:app --reload

# Frontend (autre terminal)
cd devis-frontend
npm install
npm run dev
```

## Structure du projet

```
api.py                     Point d'entree FastAPI (tous les endpoints)
extraction.py               Etape 1 : photo/vocal -> description candidate
catalogue_matching.py       Description validee -> lignes catalogue (SKU/prix)
generer_devis_complet.py    Pipeline complet -> document .docx final
photo_analyze.py            Analyse photo structuree (type piece, surface, materiaux)
vocal_transcribe.py         Transcription avec score de confiance
flou_detection.py           Detection heuristique de photo floue
catalogue.json               Catalogue des prestations (SKU, prix)
toolregistry/                Abstraction multi-provider IA + configuration
devis-frontend/              Interface React (Texte / Photo / Vocal)
benchmark/, evaluation/      Comparaison et scoring des modeles IA
tests/                       Tests end-to-end
scripts/                     Scripts utilitaires (validation + generation)
ressources/                  Jeu de donnees de test (photos, audios)
```

## Licence

Depot prive — usage interne 3LM Solutions.
