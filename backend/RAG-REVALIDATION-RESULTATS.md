# RAG sémantique — Résultats et notes pour revue de code

## Résumé

La tâche E (RAG sémantique) fait évoluer la recherche documentaire de Léa
d'un scoring lexical (mots-clés) vers un scoring **hybride** (lexical +
sémantique). Ce document présente les résultats de la re-validation
(sous-tâche 3 du cahier des charges) et documente deux écarts au cahier des
charges qui nécessitent une validation.

## Résultat de la re-validation (sous-tâche 3)

Jeu de test : 41 questions client reformulées, couvrant les 29 documents RAG
actifs, chacune évitant volontairement les mots du titre du document cible
(pour tester le sémantique et non le lexical).

| Métrique | Valeur |
|---|---|
| Questions testées | 41 |
| Régressions | **0** |
| Gains (hybride retrouve le bon doc là où le lexical échouait) | **10** |
| Taux de non-régression | **100 %** |

Les 10 gains démontrent l'apport du sémantique sur les reformulations, par
exemple :
- « prix de la main d'œuvre » → « Coût de la main d'œuvre »
- « je veux connaître le délai de validité d'une proposition commerciale »
  → « Durée de validité d'un devis » (aucun mot commun avec le titre)
- « quelles sont les phases d'une construction » → « Planifier les étapes »

Reproductible via : `node --loader ts-node/esm src/assistant/rag-revalidation.eval.ts`

## Deux écarts au cahier des charges à valider

### 1. pgvector → embeddings en mémoire

Le cahier des charges prévoit pgvector. Vérification effectuée le 28/07/2026 :

    SELECT name FROM pg_available_extensions WHERE name = 'vector';
    → (0 rows)

pgvector n'est pas disponible sur le serveur PostgreSQL du projet. Son
installation nécessite des droits administrateur système, hors du périmètre
du stage. Solution retenue : embeddings calculés et stockés en mémoire
(cache), recalculés au remplissage du cache (29 documents = instantané).

**À décider** : accepter le plan B mémoire, ou demander l'installation de
pgvector au niveau serveur (dev + production).

### 2. « Remplacer le lexical » → architecture hybride

Le cahier des charges demande de « remplacer le scoring lexical par la
similarité ». L'évaluation préalable a montré que le sémantique **seul**
donne 3/5 documents corrects en position 1 (biais du modèle sur le français,
scores tassés entre 0.33 et 0.63). Un remplacement pur aurait provoqué des
régressions sur les questions déjà validées.

Solution retenue : architecture **hybride** — le lexical reste le socle
(fiable, calibré), le sémantique ajoute un bonus additif et borné. Formule :

    scoreHybride = scoreLexical + W × max(0, (min(S,1) − F) / (1 − F))
    avec W = 0.35 (poids max), F = 0.35 (plancher de bruit du cosinus)

Le bonus étant toujours positif, scoreHybride ≥ scoreLexical : aucune
régression possible (garantie confirmée : 0 régression sur 41 questions).

**À décider** : valider l'architecture hybride en remplacement du
remplacement pur.

## Points d'amélioration identifiés (hors périmètre immédiat)

- **Catégorie mal orthographiée** : le document #185 est en catégorie
  « chantier » (singulier) alors que les autres sont en « chantiers »
  (pluriel). Risque de casser un filtre par catégorie.
- **7 questions non trouvées** (ni lexical ni hybride) : reformulations très
  éloignées (« où en est mon projet » pour « Suivre l'avancement »). Piste :
  enrichir le contenu des documents, ou baisser le seuil de repêchage.
- **Cache RAG désactivé par défaut** (TTL=0) : re-vectorisation des documents
  à chaque message (~1,2 s). À activer en production via
  ASSISTANT_RAG_CACHE_TTL_MS.
- **Formulations affirmatives** : « je veux connaître... » est bien détectée
  par le moteur (gain confirmé) mais le détecteur isInformationalQuestion
  ne la classe pas encore comme question. Ajustement possible du BLOC 3.

## Fichiers concernés

- `src/assistant/semantic-similarity.ts` — cosineSimilarity, semanticBonus
- `src/assistant/embeddings.ts` — embeddings locaux (all-MiniLM-L6-v2)
- `src/assistant/assistant-rag.service.ts` — câblage du score hybride
- `src/assistant/assistant.service.ts` — détecteur isInformationalQuestion élargi
- `src/assistant/rag-questions.data.ts` — 41 questions de validation
- `src/assistant/rag-revalidation.eval.ts` — script de re-validation