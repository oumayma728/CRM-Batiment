# Guide d'utilisation — Devis IA

## Prerequis

- Python 3.11+
- Node.js 18+ (pour le frontend)
- Une cle API Mistral (obligatoire — provider principal). Cles OpenAI /
  Anthropic / Gemini optionnelles (fallback + benchmarks uniquement).

## 1. Installation du backend

```bash
# Depuis la racine du projet
python -m venv venv
venv\Scripts\activate          # Windows (PowerShell : venv\Scripts\Activate.ps1)
# source venv/bin/activate     # macOS / Linux

pip install -r requirements.txt
```

Copiez le fichier d'exemple et renseignez vos cles :

```bash
copy .env.example .env         # Windows
# cp .env.example .env         # macOS / Linux
```

Ouvrez `.env` et renseignez au minimum :

```
MISTRAL_API_KEY=votre_cle_ici
```

## 2. Lancer le backend

```bash
uvicorn api:app --reload
```

L'API demarre sur `http://127.0.0.1:8000`. Verification rapide :

```bash
curl http://127.0.0.1:8000/health
# {"status": "ok"}
```

La documentation interactive (Swagger) est disponible sur
`http://127.0.0.1:8000/docs`.

## 3. Lancer le frontend

Dans un second terminal :

```bash
cd devis-frontend
npm install
npm run dev
```

L'interface est disponible sur `http://localhost:5173`.

> Le frontend appelle l'API sur `http://127.0.0.1:8000` en dur
> (`devis-frontend/src/App.jsx`). Adaptez cette valeur si le backend tourne
> ailleurs.

## 4. Utiliser l'application

1. Choisissez un onglet : **Texte**, **Photo** ou **Vocal**.
2. Fournissez la description du besoin :
   - **Texte** : saisissez directement la description.
   - **Photo** : importez une photo. L'IA propose une analyse (type de
     piece, surface, materiaux) — verifiez/corrigez avant de continuer.
   - **Vocal** : enregistrez ou importez un message vocal. L'IA transcrit
     avec un score de confiance — relisez/corrigez avant de continuer.
3. Une fois la description validee, l'ecran d'edition du devis s'affiche :
   les lignes correspondant au catalogue sont proposees (SKU, quantite,
   prix). Ajustez-les si necessaire.
4. Renseignez les informations entreprise/client et generez le devis.
5. Telechargez le document `.docx` genere.

Les documents generes sont ecrits dans `devis_generes/` (non versionne).

## 5. Tests et benchmarks (optionnel)

```bash
# Tests end-to-end
python -m pytest tests/

# Benchmarks par modalite (necessite les cles API des providers testes)
python -m benchmark.benchmark_texte
python -m benchmark.benchmark_vision
python -m benchmark.benchmark_vocal

# Recap / scoring
python -m evaluation.generer_recap
```

Les benchmarks utilisent le jeu de donnees d'exemple dans `ressources/`
(photos, audios, transcriptions/metadonnees de reference).

## Configuration avancee

Le provider IA actif par modalite peut etre change sans toucher au code, via
variables d'environnement (voir `.env.example`) :

```
TEXTE_MODEL=openai:gpt-4o-mini
VISION_MODEL=anthropic:claude-3-7-sonnet-20250219
VOCAL_MODEL=mistral_voxtral:voxtral-mini-latest
```

Voir `toolregistry/config.py` pour la configuration par defaut et la
strategie de fallback complete.

Le provider Whisper local (`whisper_local`) est optionnel et necessite en
plus :

```bash
pip install faster-whisper
```

## Depannage

- **`ModuleNotFoundError` au demarrage du backend** : verifiez que
  l'environnement virtuel est active et que `pip install -r requirements.txt`
  s'est bien termine sans erreur.
- **Erreur CORS depuis le frontend** : le backend n'autorise que
  `http://localhost:5173` par defaut (`api.py`) — a adapter si le frontend
  tourne sur un autre port/domaine.
- **`ProviderCallError` / echec d'appel IA (HTTP 502)** : verifiez que la
  cle API du provider actif est bien renseignee dans `.env` et valide.
