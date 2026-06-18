# Intégration IA (RAG) & WhatsApp dans BatiFlow

Ce document explique en profondeur le fonctionnement des modules d'Intelligence Artificielle et de WhatsApp au sein de BatiFlow. Il est conçu pour vous aider à comprendre l'architecture technique, le flux de données (workflow) et, surtout, pour vous donner les arguments et étapes nécessaires à présenter à votre entreprise pour la mise en production.

---

## 1. Module WhatsApp (Meta Graph API)

Le module WhatsApp permet à BatiFlow de communiquer directement avec les clients via WhatsApp Business. Il permet l'envoi de documents (Devis, Factures) et la réception de messages clients (qui sont ensuite traités par l'IA).

### Flux de fonctionnement (Workflow)

1. **Envoi de messages / documents (Sortant) :**
   - L'utilisateur du CRM clique sur "Envoyer via WhatsApp" (ex: pour un devis).
   - Le backend génère le PDF du document (via `WhatsappPdfService`).
   - Le backend envoie ce PDF aux serveurs de Meta (Facebook) via l'API Graph `POST /v25.0/{phone_number_id}/media`.
   - Meta renvoie un `media_id`.
   - Le backend envoie un message de type "document" contenant ce `media_id` au numéro du client.
   - Le message est enregistré dans la base de données (`WhatsappMessage` et `WhatsappConversation`) pour s'afficher dans l'interface de messagerie du CRM.

2. **Réception de messages (Entrant / Webhooks) :**
   - Lorsqu'un client répond sur WhatsApp, Meta envoie une requête HTTP POST (Webhook) au backend BatiFlow (`/api/whatsapp/webhook`).
   - Le `WhatsappController` valide la requête (avec `WHATSAPP_VERIFY_TOKEN`).
   - Le `WhatsappService` décompose le payload, trouve ou crée la `WhatsappConversation` correspondante via le numéro de téléphone, et sauvegarde le message.
   - Si le message est du texte, il déclenche le moteur d'IA (Chatbot Engine).

### L'Erreur d'Authentification (Code 190 OAuthException)

L'erreur que vous rencontrez actuellement (`Authentication Error, code: 190, type: OAuthException`) est **tout à fait normale**. 
Elle signifie que votre jeton d'accès (`WHATSAPP_ACCESS_TOKEN`) **a expiré**. Les jetons générés via l'interface développeur de Meta sont des jetons temporaires qui expirent au bout de 24 heures.

*Astuce technique : Si vous videz la variable `WHATSAPP_ACCESS_TOKEN=""` dans votre fichier `.env`, BatiFlow basculera automatiquement en "Mode Démo" (Dev Mode) : le système simulera l'envoi sans contacter les serveurs de Meta, vous permettant de tester l'interface sans jeton valide.*

---

## 2. Ce qu'il faut dire à votre entreprise (Déploiement WhatsApp)

Pour que BatiFlow fonctionne avec les numéros de votre entreprise et de façon permanente, voici exactement ce que vous devez expliquer à votre superviseur :

### Le pitch pour le superviseur
> *"Actuellement, j'ai développé l'intégration WhatsApp en utilisant mon propre compte développeur Meta avec un jeton de test (qui expire toutes les 24h). Pour que le CRM puisse envoyer de vrais devis aux clients de manière automatisée, nous devons lier l'application au compte WhatsApp Business officiel de l'entreprise. Cela nécessite une validation administrative par Meta et la création d'un Jeton Système permanent (System User Token)."*

### Les étapes administratives et techniques à suivre par l'entreprise :

1. **Création d'un compte Meta Business Manager :**
   L'entreprise doit avoir (ou créer) un compte sur [business.facebook.com](https://business.facebook.com).
   
2. **Vérification de l'entreprise (Obligatoire) :**
   Dans les paramètres d'entreprise (Business Settings), l'entreprise doit être vérifiée (fournir le Kbis, facture de téléphone, etc.). C'est indispensable pour avoir un accès complet à l'API WhatsApp.

3. **Création de l'application Meta Developer :**
   - Aller sur [developers.facebook.com](https://developers.facebook.com).
   - Créer une nouvelle application de type **Business**.
   - Ajouter le produit **WhatsApp**.
   - Lier cette application au compte Business Manager de l'entreprise.

4. **Ajout d'un numéro de téléphone officiel :**
   - Dans la configuration WhatsApp, ajouter le numéro de l'entreprise. (Attention: ce numéro ne doit plus être utilisé sur l'application mobile WhatsApp standard, il devient géré par l'API).
   - Meta fournira un `Phone Number ID` (à mettre dans le `.env`).

5. **Génération d'un Jeton Permanent (System User Token) :**
   C'est la solution pour éviter l'erreur 190 (expiration).
   - Dans le Business Manager, aller dans "Utilisateurs Système" (System Users).
   - Ajouter un utilisateur système avec le rôle "Employé" ou "Admin".
   - Cliquer sur "Générer un nouveau token", sélectionner l'application BatiFlow, et cocher les permissions : `whatsapp_business_messaging` et `whatsapp_business_management`.
   - **Ce token généré n'expirera jamais.** C'est lui qui ira dans le `WHATSAPP_ACCESS_TOKEN` du serveur de production.

---

## 3. Module d'Intelligence Artificielle (RAG & LLM)

Le CRM intègre un système d'IA basé sur la technique **RAG (Retrieval-Augmented Generation)**, permettant au chatbot de répondre intelligemment aux clients en se basant sur les données internes du CRM.

### Architecture de l'IA (AssistantService)

1. **Classification d'intention (Intent Classification) :**
   Quand le webhook WhatsApp reçoit un texte, le système détermine d'abord "l'intention" du client (ex: "Où en est mon chantier ?", "J'ai un problème", "Je veux un devis").
   Cela se fait dans la fonction `classifyIntent` de `WhatsappService`.

2. **Génération Augmentée par la Recherche (RAG) :**
   L'IA ne devine pas les réponses, elle cherche dans la base de données (Prisma) le contexte spécifique du client avant de générer la réponse.
   - **Exemple Statut Chantier :** L'IA récupère les chantiers associés au client (via `clientId`), regarde leur statut (`EN_COURS`, `EN_RETARD`), les tâches accomplies, et construit un *prompt* (contexte) pour le LLM (Large Language Model - OpenRouter/Llama 3).
   - **Exemple Support Technique :** L'IA détecte l'urgence, crée un "Ticket" dans la base de données, et demande au LLM de formuler une réponse rassurante indiquant que l'équipe technique a été notifiée.

3. **Génération de la réponse (LLM) :**
   Le contexte structuré est envoyé au modèle IA configuré dans le `.env` (actuellement `meta-llama/llama-3.1-8b-instruct` via OpenRouter). Le modèle lit le contexte et génère une réponse polie, formatée, et professionnelle.
   
4. **Réponse au client :**
   La réponse textuelle de l'IA est renvoyée au client via l'API WhatsApp (`sendTextMessage`), bouclant ainsi la boucle de conversation de manière entièrement automatisée.

### Pourquoi cette architecture est puissante ?
- **Sécurité des données :** L'IA n'a accès qu'aux données extraites explicitement par le backend pour le client concerné. Elle ne "lit" pas toute la base de données au hasard.
- **Fiabilité :** En donnant des instructions claires (System Prompts) et des données exactes issues du CRM (dates, prix, statuts), on évite les "hallucinations" (réponses inventées par l'IA).
- **Extensibilité :** Il est très facile d'ajouter de nouvelles "intentions" (ex: Prise de rendez-vous automatique, relance de factures impayées) en rajoutant des blocs `case` dans le moteur conversationnel.
