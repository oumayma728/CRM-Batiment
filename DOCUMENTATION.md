# Documentation complète — Module Devis IA

Ce document complète `README.md` (présentation générale, architecture) et
`USAGE.md` (installation, lancement pas à pas) — il ne les répète pas. Ici :
référence API complète, détail des fonctionnalités, et surtout les
**limites connues** du projet tel qu'il se comporte aujourd'hui, constatées
lors des tests réels sur l'application.

## 1. Référence API

Toutes les routes sont exposées par `api.py` (FastAPI), servi par défaut sur
`http://127.0.0.1:8000`. Documentation interactive auto-générée disponible
sur `/docs` une fois le backend lancé.

| Méthode | Route | Rôle |
|---|---|---|
| `POST` | `/api/devis/photo-analyze` | Analyse une photo (base64 JSON) → type de pièce, surface, matériaux, quantité d'unités si applicable, détection de flou. Utilisé par l'onglet Photo du frontend (aucun appel IA de secours si la photo est jugée floue). |
| `POST` | `/api/devis/extraire-photo` | Variante multipart (upload de fichier) de l'analyse photo, qui produit directement une **description candidate** en texte plutôt que des champs structurés. Utilisée par les scripts/tests, pas par le frontend React actuel. |
| `POST` | `/api/devis/extraire-vocal` | Transcrit un fichier audio en description candidate, avec avertissements (transcription courte, répétition détectée). |
| `POST` | `/api/devis/vocal-transcribe` | Transcription avec score de confiance et durée, pour le composant `VoiceRecorder.jsx`. |
| `POST` | `/api/devis/match-catalogue` | Fait correspondre une description libre (texte validé) aux lignes du catalogue — SKU, quantité, prix, confiance de matching. N'invente jamais de prix ni de SKU. |
| `POST` | `/api/devis/generer` | Pipeline complet : description validée → matching catalogue → document `.docx` généré et sauvegardé dans `devis_generes/`. |
| `POST` | `/api/devis/generer-depuis-lignes` | Génère le `.docx` à partir de lignes **déjà éditées manuellement** par l'utilisateur (aucun appel IA, calcul déterministe). |
| `GET` | `/api/devis/{numero_devis}/telecharger` | Télécharge le `.docx` généré. |
| `GET` | `/health` | Vérification de disponibilité (`{"status": "ok"}`). |

## 2. Fonctionnalités en détail

### Analyse photo

Le modèle de vision (Mistral `pixtral-12b-2409` par défaut) renvoie un JSON
structuré : type de pièce, surface estimée en m², matériaux identifiés,
présence d'un objet de référence pour l'échelle. Si le modèle ne respecte pas
le format numérique attendu, une extraction de secours par regex prend le
relais et dégrade explicitement le score de confiance associé.

### Détection de photo floue → bascule texte (P1 du cahier des charges)

Avant tout appel au modèle de vision, `flou_detection.py` calcule un score de
netteté (variance d'un filtre de détection de bords, sur l'image réduite à
800px). En dessous du seuil `SEUIL_VARIANCE_NETTETE = 250`, la photo est
jugée trop floue : aucun appel IA n'est fait (économie de coût), et le
frontend affiche un bandeau invitant à basculer vers l'onglet Texte.

### Estimation de quantité pour éléments facturés à l'unité

Ajout récent : en plus de la surface en m², le modèle de vision peut
renvoyer `objet_compte` (ex: "fenêtres") et `nombre_unites_estimee` (ex: 3)
quand la photo montre un élément facturé à l'unité dans le catalogue
(fenêtres, portes, radiateurs, chaudière, climatiseur, etc.). Ces deux
champs restent à `null` pour les éléments facturés au m² (sol, mur,
cloison...). Le couple n'est retenu que si les deux valeurs sont présentes et
cohérentes ; sinon les deux sont réinitialisés à `null` plutôt que d'exposer
une quantité orpheline.

**Point d'attention pour la maintenance** : cette logique de construction de
la description texte existe en **deux endroits distincts** qui doivent rester
synchronisés : `extraction.py` (utilisé par `/api/devis/extraire-photo`) et
`devis-frontend/src/components/EditDevis.jsx` (fonction
`construireDescriptionParDefaut`, utilisée par le flux réel du frontend via
`/api/devis/photo-analyze`). Toute évolution du schéma de sortie vision doit
être répercutée dans les deux fichiers.

### Matching catalogue

Approche "few-shot" : le catalogue entier (40 lignes) est injecté dans le
system prompt plutôt qu'un vrai RAG (jugé inutile à cette taille). Le modèle
choisit uniquement le SKU et estime une quantité — **le prix est toujours
calculé par le code** à partir du vrai catalogue, jamais par le modèle
(aucune hallucination de prix possible). Le prompt enseigne explicitement au
modèle de répondre `sku_catalogue: null` plutôt que d'inventer une
correspondance quand rien ne convient clairement.

### Génération du devis

`generer_devis_complet.py` produit un `.docx` fidèle au format réel de
l'entreprise (en-tête, tableau, totaux HT/TVA/TTC). Les lignes peuvent aussi
être éditées manuellement côté frontend puis envoyées à
`/api/devis/generer-depuis-lignes`, sans nouvel appel IA.

## 3. Catalogue de prestations

`catalogue.json` — 40 lignes (`BAT-001` à `BAT-040`), chacune avec SKU,
libellé, unité (m², unité, Forfait, installation) et prix HT. C'est la seule
source de vérité pour les prix ; rien n'est calculé ou halluciné par le
modèle. Voir `questions_equipe.md` pour les trous identifiés à date (ex :
réparation/reconstruction de mur en maçonnerie absente).

## 4. Configuration multi-provider

`toolregistry/config.py` définit, par modalité (texte / vision /
transcription), un provider **principal** et une chaîne de **fallback**,
chacun marqué `valide_reel` (testé avec de vraies données sur ce projet) ou
non. Aujourd'hui, seul **Mistral** est validé réellement sur les 3 modalités
(31 cas texte, 44 cas vision, 15 cas transcription) — tous les fallbacks
OpenAI/Anthropic/Gemini restent **théoriques** (jamais appelés en conditions
réelles faute de crédits). Le fallback Whisper local est validé mais avec une
limite documentée (≈20% d'hallucinations/répétitions, latence 30 à 60 fois
supérieure).

Override sans toucher au code : variables d'environnement `TEXTE_MODEL`,
`VISION_MODEL`, `VOCAL_MODEL` (format `provider:model_name`, voir
`.env.example`).

## 5. Limites connues

- **Un seul provider réellement validé (Mistral).** Les fallbacks vers
  OpenAI/Anthropic/Gemini existent dans le code mais n'ont jamais tourné en
  conditions réelles — à ne pas activer en production sans nouveau
  benchmark une fois des crédits obtenus.
- **Catalogue non garanti exhaustif.** Le comportement voulu est de refuser
  de matcher plutôt que d'inventer (`sku_catalogue: null`), ce qui est correct
  mais signifie que des besoins réels et légitimes peuvent être rejetés si le
  catalogue ne les couvre pas encore (cas constaté : réparation de mur en
  maçonnerie).
- **Double comptage possible si le matériau est ambigu.** Quand le modèle de
  vision hésite entre deux matériaux (ex: "PVC/aluminium"), le matching
  catalogue peut ajouter les deux lignes correspondantes au lieu d'une seule,
  gonflant le total. À vérifier manuellement avant validation.
- **Lignes rejetées non détaillées à l'utilisateur.** Quand aucune ligne
  n'est exploitable, l'interface affiche seulement "Aucune ligne
  exploitable — la description manque probablement de précision", sans
  indiquer ce qui a été identifié mais refusé ni pourquoi. Une amélioration a
  été proposée (afficher les besoins non matchés avec leur raison) mais n'est
  pas encore implémentée.
- **Pas de calcul de marge.** Le devis affiche uniquement le prix de vente
  catalogue HT — aucune donnée de coût de revient n'existe aujourd'hui pour
  calculer une rentabilité par ligne.
- **Fiabilité du comptage d'unités non garantie.** L'estimation
  `nombre_unites_estimee` dépend de la capacité du modèle de vision à
  compter correctement sur une seule photo (angle, cadrage, occlusion) — à
  vérifier par l'utilisateur avant de valider la description, comme toute
  extraction candidate.
- **Seuil de détection de flou calibré sur un petit échantillon** (11 photos
  réelles + variantes floutées synthétiquement). Peut nécessiter un
  recalibrage si des faux positifs/négatifs apparaissent sur un usage réel
  plus large.
- **`max_tokens` du matching catalogue (1200) dépasse la fourchette
  indicative du cahier des charges (800–1000)**, nécessaire pour traiter
  plusieurs lignes de devis en une seule réponse.
- **Score de "précision métier" auto-évalué par le modèle**, pas encore
  relu/validé par un expert BTP humain.
- **CORS restreint à `http://localhost:5173`** (`api.py`) — à adapter avant
  toute mise en ligne au-delà d'un usage local.
- **URL du backend en dur dans le frontend** (`http://127.0.0.1:8000` dans
  `App.jsx`), pas de variable d'environnement — à changer si le backend est
  déployé ailleurs qu'en local.
- **Aucune authentification/autorisation sur l'API.** Convient à un usage
  interne local, pas à une exposition plus large en l'état.
- **`devis_generes/` non versionné et jamais nettoyé automatiquement** — les
  fichiers `.docx` générés s'accumulent sur le disque.





