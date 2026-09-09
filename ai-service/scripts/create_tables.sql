-- Tables nécessaires au pipeline ai-service (PAS le schéma CRM complet).
-- Colonnes = celles lues/écrites par catalogue/ et devis_generation/.
-- Pour une copie 100 % identique au Prisma du CRM : utiliser npx prisma db push
-- depuis le repo CRM (recommandé avant la mise en prod).

CREATE TYPE "Unite" AS ENUM ('M2', 'ML', 'PIECE', 'JOUR', 'HEURE', 'LITRE', 'KG', 'FORFAIT');
CREATE TYPE "LeadSource" AS ENUM ('CHATBOT', 'TECHNICO_COMMERCIAL', 'APPEL', 'RECOMMANDATION', 'SITE_WEB', 'AUTRE');
CREATE TYPE "DevisStatut" AS ENUM ('BROUILLON', 'ENVOYE', 'ACCEPTE', 'SIGNE', 'REFUSE', 'ANNULE', 'REVISE', 'RENVOYE');

CREATE TABLE companies (
  id SERIAL PRIMARY KEY,
  nom TEXT NOT NULL,
  siret TEXT UNIQUE,
  adresse TEXT,
  telephone TEXT,
  email TEXT,
  logo TEXT,
  "tvaDefaut" DOUBLE PRECISION NOT NULL DEFAULT 20.0,
  devise TEXT NOT NULL DEFAULT 'EUR',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE clients (
  id SERIAL PRIMARY KEY,
  "companyId" INTEGER NOT NULL REFERENCES companies(id),
  nom TEXT NOT NULL,
  prenom TEXT,
  telephone TEXT,
  email TEXT,
  "adresseClient" TEXT,
  "adresseChantier" TEXT,
  source "LeadSource" NOT NULL DEFAULT 'AUTRE',
  notes TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categories_prestations (
  id SERIAL PRIMARY KEY,
  "companyId" INTEGER NOT NULL REFERENCES companies(id),
  nom TEXT NOT NULL,
  description TEXT,
  actif BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("companyId", nom)
);

CREATE TABLE prestations (
  id SERIAL PRIMARY KEY,
  "companyId" INTEGER NOT NULL REFERENCES companies(id),
  "categorieId" INTEGER NOT NULL REFERENCES categories_prestations(id),
  nom TEXT NOT NULL,
  unite "Unite" NOT NULL DEFAULT 'M2',
  "prixVenteMin" DOUBLE PRECISION NOT NULL,
  "prixVenteMax" DOUBLE PRECISION NOT NULL,
  description TEXT,
  actif BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sousCategorieId" INTEGER
);

CREATE TABLE options_prestations (
  id SERIAL PRIMARY KEY,
  "prestationId" INTEGER NOT NULL REFERENCES prestations(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  description TEXT,
  obligatoire BOOLEAN NOT NULL DEFAULT false,
  ordre INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("prestationId", nom)
);

CREATE TABLE choix_options (
  id SERIAL PRIMARY KEY,
  "optionId" INTEGER NOT NULL REFERENCES options_prestations(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  description TEXT,
  "impactPrix" DOUBLE PRECISION NOT NULL DEFAULT 0,
  actif BOOLEAN NOT NULL DEFAULT true,
  ordre INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("optionId", nom)
);

CREATE TABLE materiaux (
  id SERIAL PRIMARY KEY,
  "companyId" INTEGER NOT NULL REFERENCES companies(id),
  nom TEXT NOT NULL,
  couleur TEXT,
  finition TEXT,
  unite "Unite" NOT NULL DEFAULT 'PIECE',
  "prixAchatFixe" DOUBLE PRECISION NOT NULL,
  "fournisseurId" INTEGER,
  "dateMaj" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actif BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "stockActuel" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "stockMinimum" DOUBLE PRECISION NOT NULL DEFAULT 0
);

CREATE TABLE services_main_oeuvre (
  id SERIAL PRIMARY KEY,
  "companyId" INTEGER NOT NULL REFERENCES companies(id),
  nom TEXT NOT NULL,
  unite "Unite" NOT NULL DEFAULT 'M2',
  "prixUnitaire" DOUBLE PRECISION NOT NULL,
  "productiviteJour" DOUBLE PRECISION,
  "coutJournalier" DOUBLE PRECISION,
  actif BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE prestations_compositions (
  id SERIAL PRIMARY KEY,
  "prestationId" INTEGER NOT NULL REFERENCES prestations(id) ON DELETE CASCADE,
  "materiauId" INTEGER REFERENCES materiaux(id),
  "serviceMainOeuvreId" INTEGER REFERENCES services_main_oeuvre(id),
  "quantiteParUnite" DOUBLE PRECISION NOT NULL DEFAULT 1
);

CREATE TABLE choix_options_compositions (
  id SERIAL PRIMARY KEY,
  "choixOptionId" INTEGER NOT NULL REFERENCES choix_options(id) ON DELETE CASCADE,
  "materiauId" INTEGER REFERENCES materiaux(id),
  "serviceMainOeuvreId" INTEGER REFERENCES services_main_oeuvre(id),
  "quantiteParUnite" DOUBLE PRECISION NOT NULL DEFAULT 1
);

CREATE TABLE devis (
  id SERIAL PRIMARY KEY,
  "companyId" INTEGER NOT NULL REFERENCES companies(id),
  "clientId" INTEGER NOT NULL REFERENCES clients(id),
  "chantierId" INTEGER,
  "demandeDevisId" INTEGER,
  "createurId" INTEGER,
  reference TEXT NOT NULL UNIQUE,
  "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "versionCourante" INTEGER NOT NULL DEFAULT 1,
  statut "DevisStatut" NOT NULL DEFAULT 'BROUILLON',
  "totalHT" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalTVA" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalTTC" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "coutTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
  profit DOUBLE PRECISION NOT NULL DEFAULT 0,
  "margePourcent" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "tauxTVA" DOUBLE PRECISION NOT NULL DEFAULT 20.0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE lignes_devis (
  id SERIAL PRIMARY KEY,
  "devisId" INTEGER NOT NULL REFERENCES devis(id) ON DELETE CASCADE,
  "prestationId" INTEGER REFERENCES prestations(id),
  "materiauId" INTEGER REFERENCES materiaux(id),
  "serviceMainOeuvreId" INTEGER REFERENCES services_main_oeuvre(id),
  description TEXT,
  quantite DOUBLE PRECISION NOT NULL,
  unite "Unite" NOT NULL DEFAULT 'M2',
  dimension TEXT,
  couleur TEXT,
  finition TEXT,
  "prixUnitaireVente" DOUBLE PRECISION NOT NULL,
  "prixAchat" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "mainOeuvre" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalHT" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "coutTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ordre INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Historique immuable des sauvegardes de brouillon. Le schéma CRM complet
-- porte aussi la relation optionnelle vers users("auteurId"). Elle reste sans
-- clé étrangère ici car ce script minimal ne crée pas la table users.
CREATE TABLE versions_devis (
  id SERIAL PRIMARY KEY,
  "devisId" INTEGER NOT NULL REFERENCES devis(id) ON DELETE CASCADE,
  "auteurId" INTEGER,
  "numeroVersion" INTEGER NOT NULL,
  justification TEXT,
  "snapshotLignes" JSONB,
  "totalHT" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalTTC" DOUBLE PRECISION NOT NULL DEFAULT 0,
  profit DOUBLE PRECISION NOT NULL DEFAULT 0,
  "margePourcent" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "versions_devis_devisId_idx" ON versions_devis ("devisId");
