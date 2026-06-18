# BâtiFlow : Architecture, Workflow et Intégration IA / WhatsApp

Ce document explique en détail l'architecture, le fonctionnement des différents modules, la logique métier, ainsi que l'intégration en profondeur des modules IA (RAG) et WhatsApp de votre application BâtiFlow. L'objectif est de vous fournir une vision claire, tant côté business que côté code, afin de vous aider à bien présenter et poursuivre le développement de l'application.

---

## 1. Architecture Globale (Code Architecture)

L'application BâtiFlow est divisée en deux parties principales :

*   **Frontend (Dossier `/frontend`)** :
    *   **Technologies** : React, TypeScript, Tailwind CSS, React Router.
    *   **Rôle** : Fournir l'interface utilisateur. C'est ici que sont définis les layouts (ex: `AppLayout.tsx` pour le menu latéral) et les pages.
*   **Backend (Dossier `/backend`)** :
    *   **Technologies** : NestJS (Framework Node.js robuste et modulaire), TypeScript, Prisma (ORM pour interagir avec la base de données PostgreSQL).
    *   **Rôle** : Gérer la logique métier, exposer les APIs, traiter les webhooks (comme ceux de WhatsApp), et communiquer avec les LLMs (IA).
*   **Base de Données** : PostgreSQL (Gérée via Prisma).

**Flux de développement typique** :
1.  On modifie/crée le schéma dans `backend/prisma/schema.prisma` puis on déploie (migration).
2.  On crée le contrôleur (Endpoints API) et le service (Logique métier) dans NestJS.
3.  On consomme cette API dans le frontend (via des requêtes fetch ou axios) et on l'affiche avec des composants React.

---

## 2. Explication des Modules (Sidebar Components)

Chaque élément du menu latéral (Sidebar) représente un module spécifique de l'application. Voici ce qu'ils font et comment ils sont liés :

### A. Tableau de bord (`/admin`)
*   **Rôle** : Vue d'ensemble des statistiques de l'entreprise (devis en attente, chiffre d'affaires, tâches en cours).

### B. Clients & Devis
*   **Clients** : Gestion de la base de données des clients (nom, contact, adresse).
*   **Demandes (Demandes de devis)** : Opportunités entrantes. Un client peut faire une demande qui sera traitée pour devenir un devis.
*   **Devis** : Chiffrage des travaux. Un devis est lié à un **Client**. Il est construit en piochant dans la *Bibliothèque de prix*.
*   **Factures** : Générées à partir d'un devis accepté/terminé.
*   **WhatsApp** : Interface de messagerie intégrée au CRM permettant de discuter avec le client directement depuis BâtiFlow.
*   **Commandes (Fournisseurs)** : Commandes de matériaux nécessaires à la réalisation d'un devis/chantier.

### C. Bibliothèque de Prix
*   **Matériaux & Services MO (Main d'œuvre)** : Éléments de base avec leurs prix unitaires.
*   **Compositions** : Assemblage de matériaux et de main-d'œuvre pour créer une prestation complète (ex: "Pose d'une fenêtre" = Fenêtre (Matériau) + Heure de pose (MO)).
*   **Prestations** : Le catalogue final utilisé lors de la création d'un devis.

### D. Fournisseurs & Chantiers
*   **Fournisseurs** : Base de données des vendeurs de matériaux.
*   **Chantiers** : Une fois un **Devis** accepté, il devient un Chantier. On y suit l'avancement des travaux.
*   **Tâches chantier** : Actions assignées aux ouvriers ou chefs de chantier pour réaliser le chantier.

### E. Administration
*   **Utilisateurs** : Gestion des employés (Administrateur, Technico-commercial, Assistante, Chef de chantier).
*   **Types de projet & Paramètres** : Configuration globale.
*   **Connaissances & IA (Base IA)** : Espace où vous importez vos documents pour nourrir le module RAG (Retrieval-Augmented Generation).

**Logique Métier (Le Workflow Complet) :**
`Client (Demande)` ➡️ `Création de Devis (via Bibliothèque de prix)` ➡️ `Devis Accepté` ➡️ `Génération de Facture` & `Création du Chantier` ➡️ `Assignation des Tâches Chantier`. 
Tout au long de ce processus, l'entreprise communique avec le client via le module **WhatsApp**.

---

## 3. L'intégration de l'IA et du RAG (Retrieval-Augmented Generation)

Le module IA de BâtiFlow a deux rôles majeurs : extraire des données intelligemment et répondre aux questions via la documentation interne (RAG).

### A. Le fonctionnement du RAG (Dossiers `rag/` et `assistant/`)
*   **Le concept** : Vous chargez des documents PDF/Word dans l'application (Base IA). L'application découpe ces documents en petits morceaux et les convertit en "Vecteurs" (suite de nombres).
*   **La requête** : Quand un utilisateur pose une question au chatbot ou recherche une information, le système (`AssistantLlmService` : `generateRagAnswer`) va chercher les morceaux de textes les plus pertinents dans la base de données.
*   **La génération** : Il envoie ensuite le "contexte" trouvé + la "question" à un LLM (comme Mistral, Gemini, OpenRouter ou HuggingFace). L'IA lit le contexte et génère une réponse propre et précise basée *uniquement* sur vos documents.

### B. Extraction intelligente (`extractFieldsWithAI`)
Dans `assistant-llm.service.ts`, le système utilise l'IA pour lire un message brut (ex: "Je veux un devis pour refaire mon toit c'est urgent, appelez au 060000000") et extraire automatiquement un objet JSON structuré contenant l'intention (demande de devis), le numéro de téléphone, l'urgence, et les mots-clés. Cela permet d'automatiser la création de "Demandes" entrantes.

---

## 4. L'intégration du module WhatsApp en profondeur

Le fichier principal est `whatsapp.service.ts`. Ce module permet à BâtiFlow d'envoyer et de recevoir des messages WhatsApp via l'API officielle **Meta Graph API**.

### Comment fonctionne le flux WhatsApp ?
1.  **Réception (Webhook Incoming)** :
    Quand un client vous écrit sur WhatsApp, Meta envoie une requête HTTP (un Webhook) à votre backend (`processIncomingWebhook`).
2.  **Traitement** :
    *   BâtiFlow extrait le message, cherche si le numéro correspond à un **Client** existant dans la base de données (`findClientByPhone`), et l'associe à une `Conversation`.
    *   Il sauvegarde le message dans la base (`WhatsappMessage`).
3.  **Chatbot Automatisé (`handleInboundChatbot`)** :
    Le message passe par une classification d'intention (`classifyIntent`).
    *   Si le client demande le **Statut** ("Où en sont mes travaux ?"), le bot cherche son dernier chantier actif et lui répond automatiquement (ex: "Chantier en cours").
    *   Si le client signale un **Problème / Urgence** ("Fuite urgente"), le bot alerte tous les Administrateurs sur leur propre WhatsApp et crée un ticket de support dans le CRM.
4.  **Envoi de documents (`sendDevisViaWhatsApp` / `sendFactureViaWhatsApp`)** :
    Quand vous cliquez sur "Envoyer sur WhatsApp" depuis un Devis, le backend génère le PDF, l'envoie aux serveurs de Meta (`uploadMedia`), puis demande à Meta de l'envoyer au client.

### Comment configurer et utiliser les identifiants de l'Entreprise (Ce qu'il faut dire à votre Superviseur)

C'est ici que vous devez intervenir pour lier l'application au WhatsApp de l'entreprise. 

**Explication pour votre Superviseur :**
> "Actuellement, le module WhatsApp est développé et fonctionne parfaitement. Pour les tests, j'ai utilisé mes propres identifiants (ou un environnement de développement simulé). Pour que le CRM puisse envoyer et recevoir des messages au nom de l'entreprise (et avec le numéro de l'entreprise), nous devons relier l'application à un compte **WhatsApp Business API** via Meta."

**Les étapes concrètes à réaliser ensemble :**
1.  **Créer un compte Meta for Developers** : L'entreprise doit avoir un compte Facebook Business Manager.
2.  **Créer une application Meta** : Créer une App de type "Business" et y ajouter le produit "WhatsApp".
3.  **Associer le numéro de téléphone de l'entreprise** : Ce numéro deviendra l'expéditeur officiel.
4.  **Générer le Token Permanent et l'ID** : Meta fournira deux clés importantes :
    *   `WHATSAPP_PHONE_NUMBER_ID`
    *   `WHATSAPP_ACCESS_TOKEN` (Il faut générer un token système permanent, pas un token temporaire de 24h).
5.  **Mettre à jour le code (`.env`)** : Vous devrez remplacer vos clés de test par les clés de l'entreprise dans le fichier `.env` du serveur backend.
6.  **Configurer le Webhook dans Meta** : Pour que le CRM *reçoive* les messages, il faut donner à Meta l'URL de production de BâtiFlow (ex: `https://api.votre-crm.com/whatsapp/webhook`) et configurer un token de vérification (`WHATSAPP_VERIFY_TOKEN`).

Une fois ces clés de l'entreprise insérées dans la configuration, l'application passera de l'état "Dev Mode / Personnel" à la production, permettant à toute l'équipe de communiquer via le numéro officiel.
