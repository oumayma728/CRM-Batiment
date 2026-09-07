# API Documentation — CRM Bâtiment

## 1. Overview

This project exposes a REST API behind a global prefix:

- Base URL: http://localhost:3000/api
- Swagger UI: http://localhost:3000/api/docs

All main routes are defined in the NestJS controllers and are protected with JWT when needed.

## 2. Common conventions

### Headers

```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

### Common success response format

```json
{
  "success": true,
  "data": {}
}
```

Some controllers return raw objects directly instead of wrapping them in a `success` property, depending on the endpoint implementation.

### Common error response format

```json
{
  "statusCode": 400,
  "message": ["Email invalide"],
  "error": "Bad Request"
}
```

Typical status codes:

- 200 OK
- 201 Created
- 400 Bad Request
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found
- 500 Internal Server Error

---

## 3. Route map by business area

### 3.1 Core business routes

These are the routes used by the main commercial and project workflow:

- Authentication / user session: /api/auth
- Clients: /api/clients
- Demandes de devis: /api/demandes-devis
- Devis: /api/devis
- Devis public: /api/devis/public
- Chantiers: /api/chantiers
- Sous-traitants: /api/sous-traitants
- Factures: /api/factures
- Prestations / catalogue: /api/prestations
- Catalogue modules: /api/catalogue, /api/catalogue/materiaux, /api/catalogue/prestations, /api/catalogue/services-mo
- Assistant public: /api/assistant
- RAG / documents: /api/rag/documents

### 3.2 Admin / internal routes

These are mostly management, tracking, and operational tooling:

- Users management: /api/users
- Dashboard: /api/dashboard
- Notifications: /api/notifications
- Audit logs: /api/audit-logs
- Demo requests: /api/demo-requests
- Commandes fournisseur: /api/commandes-fournisseur
- Stock: /api/stock
- Conseil / signatures: /api/conseiller
- Assistant admin: /api/assistant/admin
- Catalogue admin entries: /api/catalogue/*

> This split keeps the document aligned with the real software workflow: commercial job execution first, then operations/admin tooling second.

---

## 4. Authentication APIs

Base path: /api/auth

### 3.1 Login

Endpoint:

```http
POST /api/auth/login
```

Request example:

```json
{
  "email": "admin@batiment.fr",
  "password": "password123"
}
```

Successful response example:

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "admin@batiment.fr",
    "nom": "Admin",
    "prenom": "Super",
    "role": "ADMIN",
    "companyId": 1
  }
}
```

Password-change-required response example:

```json
{
  "mustChangePassword": true,
  "message": "Vous devez changer votre mot de passe avant de continuer.",
  "tempToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

Error example:

```json
{
  "statusCode": 401,
  "message": "Email ou mot de passe incorrect",
  "error": "Unauthorized"
}
```

---

### 3.2 Forgot password

```http
POST /api/auth/forgot-password
```

Request:

```json
{
  "email": "admin@batiment.fr"
}
```

Response:

```json
{
  "message": "Si cet email existe, un code de réinitialisation a été envoyé."
}
```

---

### 3.3 Verify reset code

```http
POST /api/auth/verify-reset-code
```

Request:

```json
{
  "email": "admin@batiment.fr",
  "code": "482913"
}
```

Response:

```json
{
  "message": "Code valide",
  "valid": true
}
```

---

### 3.4 Reset password

```http
POST /api/auth/reset-password
```

Request:

```json
{
  "email": "admin@batiment.fr",
  "code": "482913",
  "newPassword": "NouveauMotDePasse123"
}
```

Response:

```json
{
  "message": "Mot de passe réinitialisé avec succès"
}
```

---

### 3.5 Change password

```http
POST /api/auth/change-password
Authorization: Bearer <JWT_TOKEN>
```

Request:

```json
{
  "oldPassword": "AncienMotDePasse123",
  "newPassword": "NouveauMotDePasse123"
}
```

Response:

```json
{
  "message": "Mot de passe changé avec succès.",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "admin@batiment.fr",
    "nom": "Admin",
    "prenom": "Super",
    "role": "ADMIN",
    "companyId": 1
  }
}
```

---

### 3.6 Get profile

```http
GET /api/auth/profile
Authorization: Bearer <JWT_TOKEN>
```

Response:

```json
{
  "id": 1,
  "email": "admin@batiment.fr",
  "nom": "Admin",
  "prenom": "Super",
  "role": "ADMIN",
  "telephone": "+33600000000",
  "actif": true,
  "companyId": 1
}
```

---

## 4. Users APIs

Base path: /api/users

### 4.1 List users

```http
GET /api/users
Authorization: Bearer <JWT_TOKEN>
```

Response example:

```json
[
  {
    "id": 1,
    "email": "admin@batiment.fr",
    "nom": "Admin",
    "prenom": "Super",
    "role": "ADMIN",
    "actif": true,
    "companyId": 1
  },
  {
    "id": 2,
    "email": "technico@batiment.fr",
    "nom": "Martin",
    "prenom": "Paul",
    "role": "TECHNICO",
    "actif": true,
    "companyId": 1
  }
]
```

### 4.2 Get user by id

```http
GET /api/users/2
Authorization: Bearer <JWT_TOKEN>
```

Response:

```json
{
  "id": 2,
  "email": "technico@batiment.fr",
  "nom": "Martin",
  "prenom": "Paul",
  "role": "TECHNICO",
  "companyId": 1,
  "actif": true
}
```

### 4.3 Update user

```http
PATCH /api/users/2
Authorization: Bearer <JWT_TOKEN>
```

Request:

```json
{
  "prenom": "Pierre",
  "telephone": "+33611111111",
  "actif": true
}
```

Response:

```json
{
  "id": 2,
  "email": "technico@batiment.fr",
  "nom": "Martin",
  "prenom": "Pierre",
  "telephone": "+33611111111",
  "role": "TECHNICO",
  "companyId": 1,
  "actif": true
}
```

### 4.4 Deactivate user

```http
DELETE /api/users/2
Authorization: Bearer <JWT_TOKEN>
```

Response:

```json
{
  "message": "Utilisateur désactivé",
  "user": {
    "id": 2,
    "actif": false
  }
}
```

---

## 5. Clients APIs

Base path: /api/clients

### 5.1 Create client

```http
POST /api/clients
Authorization: Bearer <JWT_TOKEN>
```

Request example:

```json
{
  "nom": "Dupont",
  "prenom": "Marie",
  "email": "marie.dupont@example.com",
  "telephone": "+33612345678",
  "adresse": "12 rue de la Paix, Paris",
  "ville": "Paris",
  "codePostal": "75002"
}
```

Response example:

```json
{
  "id": 12,
  "companyId": 1,
  "nom": "Dupont",
  "prenom": "Marie",
  "email": "marie.dupont@example.com",
  "telephone": "+33612345678",
  "adresse": "12 rue de la Paix, Paris",
  "ville": "Paris",
  "codePostal": "75002",
  "actif": true
}
```

### 5.2 List clients

```http
GET /api/clients?search=dupont&page=1&limit=20
Authorization: Bearer <JWT_TOKEN>
```

Response example:

```json
{
  "items": [
    {
      "id": 12,
      "nom": "Dupont",
      "prenom": "Marie",
      "email": "marie.dupont@example.com"
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 1
}
```

### 5.3 Get client by id

```http
GET /api/clients/12
Authorization: Bearer <JWT_TOKEN>
```

Response:

```json
{
  "id": 12,
  "companyId": 1,
  "nom": "Dupont",
  "prenom": "Marie",
  "email": "marie.dupont@example.com",
  "telephone": "+33612345678",
  "adresse": "12 rue de la Paix, Paris",
  "ville": "Paris",
  "codePostal": "75002"
}
```

### 5.4 Update client

```http
PATCH /api/clients/12
Authorization: Bearer <JWT_TOKEN>
```

Request:

```json
{
  "telephone": "+33698765432"
}
```

Response:

```json
{
  "id": 12,
  "companyId": 1,
  "nom": "Dupont",
  "prenom": "Marie",
  "telephone": "+33698765432"
}
```

---

## 6. Devis APIs

Base path: /api/devis

### 6.1 Create quote

```http
POST /api/devis
Authorization: Bearer <JWT_TOKEN>
```

Request example:

```json
{
  "clientId": 12,
  "reference": "DEV-2026-001",
  "titre": "Rénovation cuisine",
  "description": "Travaux de rénovation complète",
  "montantEstime": 14500
}
```

Response example:

```json
{
  "id": 25,
  "companyId": 1,
  "clientId": 12,
  "reference": "DEV-2026-001",
  "titre": "Rénovation cuisine",
  "statut": "BROUILLON",
  "montantEstime": 14500
}
```

### 6.2 List quotes

```http
GET /api/devis?page=1&limit=20
Authorization: Bearer <JWT_TOKEN>
```

Response example:

```json
{
  "items": [
    {
      "id": 25,
      "reference": "DEV-2026-001",
      "titre": "Rénovation cuisine",
      "statut": "BROUILLON",
      "montantEstime": 14500
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 1
}
```

### 6.3 Get quote by id

```http
GET /api/devis/25
Authorization: Bearer <JWT_TOKEN>
```

Response example:

```json
{
  "id": 25,
  "companyId": 1,
  "clientId": 12,
  "reference": "DEV-2026-001",
  "titre": "Rénovation cuisine",
  "description": "Travaux de rénovation complète",
  "statut": "BROUILLON",
  "montantEstime": 14500,
  "createdAt": "2026-09-01T10:00:00.000Z"
}
```

### 6.4 Update quote status

```http
PATCH /api/devis/25/statut
Authorization: Bearer <JWT_TOKEN>
```

Request:

```json
{
  "statut": "ENVOYE"
}
```

Response:

```json
{
  "id": 25,
  "statut": "ENVOYE",
  "updatedAt": "2026-09-01T10:10:00.000Z"
}
```

### 6.5 Add quote line

```http
POST /api/devis/25/lignes
Authorization: Bearer <JWT_TOKEN>
```

Request example:

```json
{
  "prestationId": 10,
  "quantite": 2,
  "prixUnitaire": 1200
}
```

Response example:

```json
{
  "id": 77,
  "devisId": 25,
  "prestationId": 10,
  "quantite": 2,
  "prixUnitaire": 1200,
  "montantLigne": 2400
}
```

---

## 7. Chantiers APIs

Base path: /api/chantiers

### 7.1 Create chantier

```http
POST /api/chantiers
Authorization: Bearer <JWT_TOKEN>
```

Request example:

```json
{
  "devisId": 25,
  "nom": "Chantier Rue des Fleurs",
  "adresse": "12 rue des Fleurs, Paris",
  "dateDebut": "2026-09-15",
  "chefChantierId": 3
}
```

Response example:

```json
{
  "id": 8,
  "devisId": 25,
  "nom": "Chantier Rue des Fleurs",
  "adresse": "12 rue des Fleurs, Paris",
  "dateDebut": "2026-09-15T00:00:00.000Z",
  "statut": "PLANIFIE"
}
```

### 7.2 Get chantier details

```http
GET /api/chantiers/8
Authorization: Bearer <JWT_TOKEN>
```

Response example:

```json
{
  "id": 8,
  "nom": "Chantier Rue des Fleurs",
  "adresse": "12 rue des Fleurs, Paris",
  "statut": "PLANIFIE",
  "chefChantier": {
    "id": 3,
    "nom": "Morel",
    "prenom": "Jean"
  }
}
```

### 7.3 Save 2D plan / design for a chantier

This is the backend endpoint used for the 2D design / plan import workflow.

```http
PATCH /api/chantiers/8/plan-2d
Authorization: Bearer <JWT_TOKEN>
```

Request example:

```json
{
  "plan2d": {
    "version": 1,
    "layers": [
      {
        "id": "wall-01",
        "type": "wall",
        "points": [
          { "x": 10, "y": 20 },
          { "x": 120, "y": 20 }
        ]
      }
    ],
    "dimensions": {
      "width": 600,
      "height": 400
    }
  },
  "imageDataUrl": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
}
```

Response example:

```json
{
  "id": 8,
  "reference": "CH-2026-008",
  "plan2d": {
    "version": 1,
    "layers": [
      {
        "id": "wall-01",
        "type": "wall"
      }
    ]
  },
  "updatedAt": "2026-09-01T11:00:00.000Z"
}
```

### 7.4 Delete 2D plan

```http
DELETE /api/chantiers/8/plan-2d
Authorization: Bearer <JWT_TOKEN>
```

Response example:

```json
{
  "message": "Plan 2D supprimé",
  "chantierId": 8
}
```

> Note: there is no dedicated map or geolocation route in the current backend. The project supports 2D plan design on chantier objects, but not a separate public map API.

---

## 8. Mailing / email workflow APIs

The project has real email sending logic via the MailService. If SMTP credentials are absent, the service logs the email content instead of sending it.

### 8.1 Send quote by email to client

```http
POST /api/devis/25/send-client
Authorization: Bearer <JWT_TOKEN>
```

This sends the proposal email to the client with validation and signature links.

### 8.2 Send invoice by email to client

```http
POST /api/factures/9/send-client
Authorization: Bearer <JWT_TOKEN>
```

Request example:

```json
{
  "subject": "Votre facture FAC-2026-009",
  "customMessage": "Merci pour votre confiance. Nous restons à votre disposition."
}
```

### 8.3 Send supplier order email

```http
POST /api/commandes-fournisseur/12/send
Authorization: Bearer <JWT_TOKEN>
```

This sends the supplier order summary by email after internal validation.

### 8.4 Reset password email flow

```http
POST /api/auth/forgot-password
```

```json
{
  "email": "admin@batiment.fr"
}
```

This triggers the password reset code email through the mail service.

### 8.5 Temporary password email on user creation

When an admin creates a user or resets a temporary password, the backend can send a temporary password email with the account details.

---

## 9. Additional API routes missing from the first pass

This section covers the endpoints that were not fully included earlier in the document but are actually implemented in the backend.

### 9.1 Root / app health

```http
GET /
```

Simple health root endpoint.

Response example:

```json
"Hello World!"
```

### 9.2 Dashboard admin stats

```http
GET /api/dashboard/stats
Authorization: Bearer <JWT_TOKEN>
```

Response example:

```json
{
  "caTotal": 125000,
  "nombreDevis": 42,
  "nombreChantiers": 18,
  "nombreClients": 38,
  "tendance": {
    "mois": "2026-09",
    "variation": 12.4
  }
}
```

### 9.3 Notifications

```http
GET /api/notifications/internal
Authorization: Bearer <JWT_TOKEN>
```

Response example:

```json
{
  "items": [
    {
      "id": 1,
      "type": "P0",
      "title": "Signature devis en attente",
      "message": "Le devis DEV-2026-001 attend encore la validation client.",
      "createdAt": "2026-09-01T09:45:00.000Z"
    }
  ],
  "total": 1
}
```

### 9.4 Audit logs

```http
GET /api/audit-logs?page=1&limit=20&search=devis
Authorization: Bearer <JWT_TOKEN>
```

Response example:

```json
{
  "items": [
    {
      "id": 10,
      "entity": "Devis",
      "action": "UPDATE",
      "userId": 2,
      "createdAt": "2026-09-01T10:10:00.000Z",
      "details": {
        "statut": "ENVOYE"
      }
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 1
}
```

### 9.5 Demo requests (public + back-office)

#### Public submission

```http
POST /api/demo-requests/public
```

Request example:

```json
{
  "nom": "Lemoine",
  "prenom": "Adrien",
  "email": "adrien@example.com",
  "telephone": "+33612345678",
  "societe": "Bâtiment Plus",
  "message": "Nous souhaitons une démo sur la gestion des devis et chantiers."
}
```

Response example:

```json
{
  "id": 8,
  "nom": "Lemoine",
  "prenom": "Adrien",
  "email": "adrien@example.com",
  "createdAt": "2026-09-01T11:00:00.000Z"
}
```

#### List all demo requests

```http
GET /api/demo-requests
Authorization: Bearer <JWT_TOKEN>
```

#### Summary

```http
GET /api/demo-requests/summary
Authorization: Bearer <JWT_TOKEN>
```

#### Assignees

```http
GET /api/demo-requests/assignees
Authorization: Bearer <JWT_TOKEN>
```

#### Detail and update

```http
GET /api/demo-requests/8
Authorization: Bearer <JWT_TOKEN>
```

```http
PATCH /api/demo-requests/8
Authorization: Bearer <JWT_TOKEN>
```

Request example:

```json
{
  "statut": "ASSIGNE",
  "assigneeId": 3
}
```

### 9.6 Demandes de devis

```http
POST /api/demandes-devis/:id/convert
Authorization: Bearer <JWT_TOKEN>
```

```http
POST /api/demandes-devis
Authorization: Bearer <JWT_TOKEN>
```

```http
GET /api/demandes-devis
Authorization: Bearer <JWT_TOKEN>
```

```http
GET /api/demandes-devis/:id
Authorization: Bearer <JWT_TOKEN>
```

```http
PATCH /api/demandes-devis/:id
Authorization: Bearer <JWT_TOKEN>
```

```http
PATCH /api/demandes-devis/:id/statut
Authorization: Bearer <JWT_TOKEN>
```

```http
DELETE /api/demandes-devis/:id
Authorization: Bearer <JWT_TOKEN>
```

```http
POST /api/demandes-devis/:id/convertir-en-devis
Authorization: Bearer <JWT_TOKEN>
```

Request example for creation:

```json
{
  "clientId": 12,
  "titre": "Rénovation complète appartement",
  "description": "Travaux de plomberie, peinture et carrelage",
  "budgetEstime": 18000,
  "typeProjetId": 4
}
```

### 9.7 Commandes fournisseur

```http
GET /api/commandes-fournisseur
Authorization: Bearer <JWT_TOKEN>
```

```http
GET /api/commandes-fournisseur/:id
Authorization: Bearer <JWT_TOKEN>
```

```http
PATCH /api/commandes-fournisseur/:id
Authorization: Bearer <JWT_TOKEN>
```

```http
POST /api/commandes-fournisseur/:id/send
Authorization: Bearer <JWT_TOKEN>
```

```http
POST /api/commandes-fournisseur/:id/validate
Authorization: Bearer <JWT_TOKEN>
```

```http
POST /api/commandes-fournisseur/:id/receptions
Authorization: Bearer <JWT_TOKEN>
```

Request example for reception:

```json
{
  "quantiteRecue": 10,
  "dateReception": "2026-09-01",
  "notes": "Réception conforme"
}
```

### 9.8 Stock

```http
GET /api/stock
Authorization: Bearer <JWT_TOKEN>
```

```http
GET /api/stock/mouvements?materiauId=5&limit=20
Authorization: Bearer <JWT_TOKEN>
```

```http
POST /api/stock/mouvements
Authorization: Bearer <JWT_TOKEN>
```

Request example:

```json
{
  "materiauId": 5,
  "type": "ENTREE",
  "quantite": 12,
  "coutUnitaire": 45,
  "notes": "Livraison fournisseur A"
}
```

```http
PATCH /api/stock/materiaux/:id/seuil
Authorization: Bearer <JWT_TOKEN>
```

Request example:

```json
{
  "stockMinimum": 20
}
```

### 9.9 Conseiller signature endpoints

```http
GET /api/conseiller/signature
Authorization: Bearer <JWT_TOKEN>
```

```http
POST /api/conseiller/signature
Authorization: Bearer <JWT_TOKEN>
```

Request example:

```json
{
  "signatureDataUrl": "data:image/png;base64,..."
}
```

### 9.10 Catalogue submodules

#### Catalogue principal

```http
POST /api/catalogue/categories
Authorization: Bearer <JWT_TOKEN>
```

```http
GET /api/catalogue/categories
Authorization: Bearer <JWT_TOKEN>
```

```http
GET /api/catalogue/categories/:id
Authorization: Bearer <JWT_TOKEN>
```

```http
POST /api/catalogue/sous-categories
Authorization: Bearer <JWT_TOKEN>
```

```http
GET /api/catalogue
Authorization: Bearer <JWT_TOKEN>
```

```http
GET /api/catalogue/search?q=carrelage
Authorization: Bearer <JWT_TOKEN>
```

#### Catalogue matériaux

```http
POST /api/catalogue/materiaux
Authorization: Bearer <JWT_TOKEN>
```

```http
GET /api/catalogue/materiaux
Authorization: Bearer <JWT_TOKEN>
```

```http
GET /api/catalogue/materiaux/:id
Authorization: Bearer <JWT_TOKEN>
```

```http
PUT /api/catalogue/materiaux/:id
Authorization: Bearer <JWT_TOKEN>
```

```http
DELETE /api/catalogue/materiaux/:id
Authorization: Bearer <JWT_TOKEN>
```

```http
GET /api/catalogue/materiaux/:id/prix-estime?quantite=10
Authorization: Bearer <JWT_TOKEN>
```

#### Catalogue prestations

```http
POST /api/catalogue/prestations
Authorization: Bearer <JWT_TOKEN>
```

```http
GET /api/catalogue/prestations
Authorization: Bearer <JWT_TOKEN>
```

```http
GET /api/catalogue/prestations/:id/complete
Authorization: Bearer <JWT_TOKEN>
```

```http
PUT /api/catalogue/prestations/:id
Authorization: Bearer <JWT_TOKEN>
```

```http
DELETE /api/catalogue/prestations/:id
Authorization: Bearer <JWT_TOKEN>
```

```http
POST /api/catalogue/prestations/:id/compositions
Authorization: Bearer <JWT_TOKEN>
```

```http
POST /api/catalogue/prestations/:id/options
Authorization: Bearer <JWT_TOKEN>
```

```http
POST /api/catalogue/prestations/options/:optionId/choix
Authorization: Bearer <JWT_TOKEN>
```

#### Catalogue services MO

```http
POST /api/catalogue/services-mo
Authorization: Bearer <JWT_TOKEN>
```

```http
GET /api/catalogue/services-mo
Authorization: Bearer <JWT_TOKEN>
```

```http
GET /api/catalogue/services-mo/:id
Authorization: Bearer <JWT_TOKEN>
```

```http
PUT /api/catalogue/services-mo/:id
Authorization: Bearer <JWT_TOKEN>
```

```http
DELETE /api/catalogue/services-mo/:id
Authorization: Bearer <JWT_TOKEN>
```

```http
GET /api/catalogue/services-mo/:id/prix?quantite=8
Authorization: Bearer <JWT_TOKEN>
```

---

## 10. Sous-traitants APIs

Base path: /api/sous-traitants

### 8.1 Create sous-traitant

```http
POST /api/sous-traitants
Authorization: Bearer <JWT_TOKEN>
```

Request:

```json
{
  "nom": "Durand",
  "prenom": "Luc",
  "email": "luc.durand@artisan.fr",
  "telephone": "+33677889900",
  "specialite": "Peinture"
}
```

Response:

```json
{
  "id": 5,
  "nom": "Durand",
  "prenom": "Luc",
  "email": "luc.durand@artisan.fr",
  "specialite": "Peinture",
  "companyId": 1
}
```

### 8.2 Create assurance

```http
POST /api/sous-traitants/assurances
Authorization: Bearer <JWT_TOKEN>
```

Request:

```json
{
  "sousTraitantId": 5,
  "numeroPolice": "ASS-2026-001",
  "dateExpiration": "2027-06-30",
  "societe": "AXA"
}
```

Response:

```json
{
  "id": 3,
  "sousTraitantId": 5,
  "numeroPolice": "ASS-2026-001",
  "dateExpiration": "2027-06-30T00:00:00.000Z",
  "societe": "AXA"
}
```

---

## 9. Factures APIs

Base path: /api/factures

### 9.1 Generate factures from a quote

```http
POST /api/factures/from-devis/25
Authorization: Bearer <JWT_TOKEN>
```

Response example:

```json
{
  "id": 9,
  "devisId": 25,
  "numero": "FAC-2026-009",
  "montantTotal": 14500,
  "statut": "BROUILLON"
}
```

---

## 10. Prestations / catalog APIs

Base path: /api/prestations

### 10.1 List catalogue

```http
GET /api/prestations/catalogue
Authorization: Bearer <JWT_TOKEN>
```

Response example:

```json
[
  {
    "id": 1,
    "nom": "Pose de carrelage",
    "categorieId": 2,
    "actif": true,
    "prixBase": 1200
  },
  {
    "id": 2,
    "nom": "Peinture murale",
    "categorieId": 2,
    "actif": true,
    "prixBase": 850
  }
]
```

### 10.2 Create category

```http
POST /api/prestations/categories
Authorization: Bearer <JWT_TOKEN>
```

Request:

```json
{
  "nom": "Rénovation intérieure",
  "description": "Travaux intérieurs"
}
```

Response:

```json
{
  "id": 7,
  "companyId": 1,
  "nom": "Rénovation intérieure",
  "description": "Travaux intérieurs",
  "actif": true
}
```

---

## 11. Assistant IA APIs

Base path: /api/assistant

### 11.1 Start assistant session

```http
POST /api/assistant/session/start
Authorization: Bearer <JWT_TOKEN>
```

Request:

```json
{
  "context": "Projet de rénovation",
  "clientName": "Dupont"
}
```

Response:

```json
{
  "sessionId": "a17d19f0-3f76-4a8e-a4d2-e5a35e76a60d",
  "createdAt": "2026-09-01T10:20:00.000Z"
}
```

### 11.2 Send message to assistant

```http
POST /api/assistant/session/a17d19f0-3f76-4a8e-a4d2-e5a35e76a60d/message
Authorization: Bearer <JWT_TOKEN>
```

Request:

```json
{
  "message": "Quelle est la meilleure solution pour rénover cette cuisine ?"
}
```

Response:

```json
{
  "response": "Pour une cuisine de cette taille, je recommande ...",
  "sessionId": "a17d19f0-3f76-4a8e-a4d2-e5a35e76a60d"
}
```

---

## 12. RAG / document APIs

Base path: /api/rag/documents

### 12.1 Add document

```http
POST /api/rag/documents
Authorization: Bearer <JWT_TOKEN>
```

Request:

```json
{
  "title": "Plaquette de chantier",
  "content": "Contenu du document...",
  "tags": ["chantier", "planning"]
}
```

Response:

```json
{
  "id": 4,
  "title": "Plaquette de chantier",
  "tags": ["chantier", "planning"],
  "createdAt": "2026-09-01T10:30:00.000Z"
}
```

---

## 13. Error examples

### 13.1 Unauthorized

```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

### 13.2 Forbidden

```json
{
  "statusCode": 403,
  "message": "Accès interdit",
  "error": "Forbidden"
}
```

### 13.3 Validation error

```json
{
  "statusCode": 400,
  "message": [
    "L'email doit être valide",
    "Le mot de passe est obligatoire"
  ],
  "error": "Bad Request"
}
```

---

## 14. Useful tips

- Use Swagger for interactive testing: http://localhost:3000/api/docs
- Always send the JWT token on protected endpoints.
- Keep the final request body consistent with DTO validation rules.
- Prefer using the exact model names and fields from Prisma schema and controller DTOs.

## 15. Full route list by module

- Auth: /api/auth
- Users: /api/users
- Clients: /api/clients
- Devis: /api/devis
- Devis public: /api/devis/public
- Factures: /api/factures
- Fournisseurs: /api/fournisseurs
- Matériaux: /api/materiaux
- Services MO: /api/services-mo
- Prestations: /api/prestations
- Catalogue: /api/catalogue
- Types de projet: /api/types-projet
- Chantiers: /api/chantiers
- Sous-traitants: /api/sous-traitants
- Sous-traitant portal: /api/sous-traitant
- Portail fournisseur: /api/portail-fournisseur
- SAV: /api/sav
- Notifications: /api/notifications
- Assistant IA: /api/assistant
- Assistant admin: /api/assistant/admin
- RAG documents: /api/rag/documents
- Audit logs: /api/audit-logs
- Dashboard: /api/dashboard
- Dev seed: /api/dev

This file gives a strong project-level API reference while remaining aligned with the routes actually exposed by the backend controllers.
