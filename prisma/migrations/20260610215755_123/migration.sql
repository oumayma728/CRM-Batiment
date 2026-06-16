-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'TECHNICO', 'ASSISTANTE', 'CHEF_CHANTIER', 'SOUS_TRAITANT');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('CHATBOT', 'TECHNICO_COMMERCIAL', 'APPEL', 'RECOMMANDATION', 'SITE_WEB', 'AUTRE');

-- CreateEnum
CREATE TYPE "DemandeStatut" AS ENUM ('NOUVEAU', 'EN_COURS', 'QUALIFIE', 'CONVERTI', 'PERDU');

-- CreateEnum
CREATE TYPE "DevisStatut" AS ENUM ('BROUILLON', 'ENVOYE', 'ACCEPTE', 'SIGNE', 'REFUSE', 'ANNULE', 'REVISE', 'RENVOYE');

-- CreateEnum
CREATE TYPE "DevisClientSignatureStatut" AS ENUM ('EN_ATTENTE', 'OTP_ENVOYE', 'OTP_VERIFIE', 'SIGNE_CLIENT', 'BLOQUE', 'EXPIRE', 'ANNULE');

-- CreateEnum
CREATE TYPE "FactureStatut" AS ENUM ('BROUILLON', 'ENVOYEE', 'PAYEE', 'ANNULEE');

-- CreateEnum
CREATE TYPE "FactureType" AS ENUM ('ACOMPTE', 'FINALE');

-- CreateEnum
CREATE TYPE "BonCommandeStatut" AS ENUM ('BROUILLON', 'VALIDE', 'ENVOYE', 'ANNULE');

-- CreateEnum
CREATE TYPE "CommandeFournisseurStatut" AS ENUM ('CREEE', 'ENVOYEE', 'EXPEDIEE', 'PARTIELLE', 'RECUE', 'CLOTUREE');

-- CreateEnum
CREATE TYPE "ChantierStatut" AS ENUM ('VISITE_TECHNIQUE', 'DEVIS_EN_PREPARATION', 'DEVIS_ENVOYE', 'NEGOCIATION_EN_COURS', 'DEVIS_VALIDE', 'COMMANDES_GENEREES', 'MATERIAUX_EN_LIVRAISON', 'MATERIAUX_RECEPTIONNES', 'PLANIFIE', 'DEMARRE', 'EN_COURS', 'TERMINE', 'CLOTURE');

-- CreateEnum
CREATE TYPE "TacheStatut" AS ENUM ('A_FAIRE', 'EN_COURS', 'BLOQUEE', 'TERMINEE');

-- CreateEnum
CREATE TYPE "EquipeType" AS ENUM ('INTERNE', 'SOUS_TRAITANT');

-- CreateEnum
CREATE TYPE "Unite" AS ENUM ('M2', 'ML', 'PIECE', 'JOUR', 'HEURE', 'LITRE', 'KG', 'FORFAIT');

-- CreateEnum
CREATE TYPE "ModeValidation" AS ENUM ('EMAIL', 'SIGNATURE', 'VERBAL', 'AUTRE');

-- CreateTable
CREATE TABLE "companies" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "siret" TEXT,
    "adresse" TEXT,
    "telephone" TEXT,
    "email" TEXT,
    "logo" TEXT,
    "tvaDefaut" DOUBLE PRECISION NOT NULL DEFAULT 20.0,
    "devise" TEXT NOT NULL DEFAULT 'EUR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "telephone" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "signatureBase64" TEXT,
    "signatureUpdatedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "types_projet" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "types_projet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT,
    "telephone" TEXT,
    "email" TEXT,
    "adresseClient" TEXT,
    "adresseChantier" TEXT,
    "source" "LeadSource" NOT NULL DEFAULT 'AUTRE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "besoin" TEXT,
    "typeProjetId" INTEGER,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients_types_projet" (
    "clientId" INTEGER NOT NULL,
    "typeProjetId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clients_types_projet_pkey" PRIMARY KEY ("clientId","typeProjetId")
);

-- CreateTable
CREATE TABLE "demandes_devis" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "clientId" INTEGER NOT NULL,
    "createurId" INTEGER,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" "LeadSource" NOT NULL DEFAULT 'AUTRE',
    "description" TEXT NOT NULL,
    "besoinStructure" JSONB,
    "statut" "DemandeStatut" NOT NULL DEFAULT 'NOUVEAU',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "demandes_devis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories_prestations" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_prestations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "types_projet_categories" (
    "typeProjetId" INTEGER NOT NULL,
    "categorieId" INTEGER NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "types_projet_categories_pkey" PRIMARY KEY ("typeProjetId","categorieId")
);

-- CreateTable
CREATE TABLE "sous_categories" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "categorieId" INTEGER NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sous_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prestations" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "categorieId" INTEGER NOT NULL,
    "nom" TEXT NOT NULL,
    "unite" "Unite" NOT NULL DEFAULT 'M2',
    "prixVenteMin" DOUBLE PRECISION NOT NULL,
    "prixVenteMax" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sousCategorieId" INTEGER,

    CONSTRAINT "prestations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "options_prestations" (
    "id" SERIAL NOT NULL,
    "prestationId" INTEGER NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "obligatoire" BOOLEAN NOT NULL DEFAULT false,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "options_prestations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "choix_options" (
    "id" SERIAL NOT NULL,
    "optionId" INTEGER NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "impactPrix" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "choix_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prestations_compositions" (
    "id" SERIAL NOT NULL,
    "prestationId" INTEGER NOT NULL,
    "materiauId" INTEGER,
    "serviceMainOeuvreId" INTEGER,
    "quantiteParUnite" DOUBLE PRECISION NOT NULL DEFAULT 1,

    CONSTRAINT "prestations_compositions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "choix_options_compositions" (
    "id" SERIAL NOT NULL,
    "choixOptionId" INTEGER NOT NULL,
    "materiauId" INTEGER,
    "serviceMainOeuvreId" INTEGER,
    "quantiteParUnite" DOUBLE PRECISION NOT NULL DEFAULT 1,

    CONSTRAINT "choix_options_compositions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materiaux" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "nom" TEXT NOT NULL,
    "couleur" TEXT,
    "finition" TEXT,
    "unite" "Unite" NOT NULL DEFAULT 'PIECE',
    "prixAchatFixe" DOUBLE PRECISION NOT NULL,
    "fournisseurId" INTEGER,
    "dateMaj" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "materiaux_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services_main_oeuvre" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "nom" TEXT NOT NULL,
    "unite" "Unite" NOT NULL DEFAULT 'M2',
    "prixUnitaire" DOUBLE PRECISION NOT NULL,
    "productiviteJour" DOUBLE PRECISION,
    "coutJournalier" DOUBLE PRECISION,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "services_main_oeuvre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devis" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "clientId" INTEGER NOT NULL,
    "chantierId" INTEGER,
    "demandeDevisId" INTEGER,
    "createurId" INTEGER,
    "reference" TEXT NOT NULL,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "versionCourante" INTEGER NOT NULL DEFAULT 1,
    "statut" "DevisStatut" NOT NULL DEFAULT 'BROUILLON',
    "totalHT" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalTVA" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalTTC" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "coutTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "profit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "margePourcent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tauxTVA" DOUBLE PRECISION NOT NULL DEFAULT 20.0,
    "dateEnvoi" TIMESTAMP(3),
    "dateValidation" TIMESTAMP(3),
    "modeValidation" "ModeValidation",
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "signatureClientBase64" TEXT,
    "signatureClientDate" TIMESTAMP(3),
    "signatureConseillerBase64" TEXT,
    "signatureConseillerDate" TIMESTAMP(3),

    CONSTRAINT "devis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devis_client_signature_requests" (
    "id" SERIAL NOT NULL,
    "devisId" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "telephoneClient" TEXT NOT NULL,
    "statut" "DevisClientSignatureStatut" NOT NULL DEFAULT 'EN_ATTENTE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "otpCodeHash" TEXT,
    "otpExpiresAt" TIMESTAMP(3),
    "otpAttempts" INTEGER NOT NULL DEFAULT 0,
    "otpSentAt" TIMESTAMP(3),
    "otpVerifiedAt" TIMESTAMP(3),
    "blockedAt" TIMESTAMP(3),
    "clientSignedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "devis_client_signature_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "versions_devis" (
    "id" SERIAL NOT NULL,
    "devisId" INTEGER NOT NULL,
    "auteurId" INTEGER,
    "numeroVersion" INTEGER NOT NULL,
    "justification" TEXT,
    "snapshotLignes" JSONB,
    "totalHT" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalTTC" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "profit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "margePourcent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "versions_devis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lignes_devis" (
    "id" SERIAL NOT NULL,
    "devisId" INTEGER NOT NULL,
    "prestationId" INTEGER,
    "materiauId" INTEGER,
    "serviceMainOeuvreId" INTEGER,
    "description" TEXT,
    "quantite" DOUBLE PRECISION NOT NULL,
    "unite" "Unite" NOT NULL DEFAULT 'M2',
    "dimension" TEXT,
    "couleur" TEXT,
    "finition" TEXT,
    "prixUnitaireVente" DOUBLE PRECISION NOT NULL,
    "prixAchat" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mainOeuvre" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalHT" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "coutTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lignes_devis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "factures" (
    "id" SERIAL NOT NULL,
    "devisId" INTEGER NOT NULL,
    "reference" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "montantHT" DOUBLE PRECISION NOT NULL,
    "montantTVA" DOUBLE PRECISION NOT NULL,
    "montantTTC" DOUBLE PRECISION NOT NULL,
    "statut" "FactureStatut" NOT NULL DEFAULT 'BROUILLON',
    "pdfUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "dateEcheance" TIMESTAMP(3),
    "referenceDevis" TEXT,
    "tauxTVA" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "typeFacture" "FactureType" NOT NULL DEFAULT 'FINALE',
    "acomptePercent" DOUBLE PRECISION,
    "acompteMontant" DOUBLE PRECISION,
    "nomClient" TEXT,
    "prenomClient" TEXT,
    "emailClient" TEXT,
    "telephoneClient" TEXT,
    "adresseClient" TEXT,
    "companyNom" TEXT,
    "companyEmail" TEXT,
    "companyTelephone" TEXT,
    "companyAdresse" TEXT,
    "companySiret" TEXT,
    "conditionsPaiement" TEXT,
    "communicationPaiement" TEXT,
    "notesLegales" TEXT,
    "referencePaiement" TEXT,
    "emailEnvoiClient" TEXT,
    "dateEnvoiClient" TIMESTAMP(3),
    "datePaiement" TIMESTAMP(3),

    CONSTRAINT "factures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lignes_facture" (
    "id" SERIAL NOT NULL,
    "factureId" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "datePrestation" TIMESTAMP(3),
    "quantite" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unite" TEXT NOT NULL DEFAULT 'UNITE',
    "prixUnitaireHT" DOUBLE PRECISION NOT NULL,
    "tauxTVA" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "montantHT" DOUBLE PRECISION NOT NULL,
    "montantTVA" DOUBLE PRECISION NOT NULL,
    "montantTTC" DOUBLE PRECISION NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lignes_facture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bons_commande" (
    "id" SERIAL NOT NULL,
    "devisId" INTEGER NOT NULL,
    "reference" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statut" "BonCommandeStatut" NOT NULL DEFAULT 'BROUILLON',
    "pdfUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bons_commande_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fournisseurs" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "nom" TEXT NOT NULL,
    "contact" TEXT,
    "email" TEXT,
    "telephone" TEXT,
    "adresse" TEXT,
    "typesMateriaux" TEXT,
    "delaiLivraison" INTEGER,
    "conditions" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fournisseurs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commandes_fournisseur" (
    "id" SERIAL NOT NULL,
    "devisId" INTEGER NOT NULL,
    "fournisseurId" INTEGER NOT NULL,
    "reference" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statutLivraison" "CommandeFournisseurStatut" NOT NULL DEFAULT 'CREEE',
    "dateEnvoi" TIMESTAMP(3),
    "dateLivraisonPrevue" TIMESTAMP(3),
    "notes" TEXT,
    "pdfUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commandes_fournisseur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lignes_commande_fournisseur" (
    "id" SERIAL NOT NULL,
    "commandeFournisseurId" INTEGER NOT NULL,
    "materiauNom" TEXT NOT NULL,
    "quantite" DOUBLE PRECISION NOT NULL,
    "unite" "Unite" NOT NULL DEFAULT 'PIECE',
    "prixUnitaire" DOUBLE PRECISION NOT NULL,
    "totalHT" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lignes_commande_fournisseur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receptions" (
    "id" SERIAL NOT NULL,
    "commandeFournisseurId" INTEGER NOT NULL,
    "dateReception" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "quantiteRecue" DOUBLE PRECISION NOT NULL,
    "quantiteAttendue" DOUBLE PRECISION NOT NULL,
    "partielle" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "receptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chantiers" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "clientId" INTEGER NOT NULL,
    "chefChantierId" INTEGER,
    "reference" TEXT NOT NULL,
    "adresse" TEXT NOT NULL,
    "description" TEXT,
    "statut" "ChantierStatut" NOT NULL DEFAULT 'VISITE_TECHNIQUE',
    "dateDebut" TIMESTAMP(3),
    "dateFin" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chantiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipes" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "nom" TEXT NOT NULL,
    "type" "EquipeType" NOT NULL DEFAULT 'INTERNE',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "taches" (
    "id" SERIAL NOT NULL,
    "chantierId" INTEGER NOT NULL,
    "libelle" TEXT NOT NULL,
    "description" TEXT,
    "statut" "TacheStatut" NOT NULL DEFAULT 'A_FAIRE',
    "dateDebut" TIMESTAMP(3),
    "dateFin" TIMESTAMP(3),
    "avancement" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commentaire" TEXT,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "taches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affectations_taches" (
    "id" SERIAL NOT NULL,
    "tacheId" INTEGER NOT NULL,
    "userId" INTEGER,
    "equipeId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "affectations_taches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents_chantier" (
    "id" SERIAL NOT NULL,
    "chantierId" INTEGER NOT NULL,
    "nom" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_chantier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_sessions" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "clientNom" TEXT,
    "clientEmail" TEXT,
    "clientTelephone" TEXT,
    "besoinStructure" JSONB,
    "terminee" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages_chat" (
    "id" SERIAL NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "userId" INTEGER,
    "role" TEXT NOT NULL,
    "contenu" TEXT NOT NULL,
    "nlpResultat" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_chat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rag_documents" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "titre" TEXT NOT NULL,
    "categorie" TEXT NOT NULL,
    "contenu" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "priorite" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rag_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "userId" INTEGER,
    "action" TEXT NOT NULL,
    "entite" TEXT NOT NULL,
    "entiteId" INTEGER NOT NULL,
    "ancienneValeur" JSONB,
    "nouvelleValeur" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "companies_siret_key" ON "companies"("siret");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_companyId_idx" ON "users"("companyId");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "types_projet_companyId_idx" ON "types_projet"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "types_projet_companyId_nom_key" ON "types_projet"("companyId", "nom");

-- CreateIndex
CREATE INDEX "clients_companyId_idx" ON "clients"("companyId");

-- CreateIndex
CREATE INDEX "clients_nom_idx" ON "clients"("nom");

-- CreateIndex
CREATE INDEX "clients_email_idx" ON "clients"("email");

-- CreateIndex
CREATE INDEX "clients_typeProjetId_idx" ON "clients"("typeProjetId");

-- CreateIndex
CREATE INDEX "clients_types_projet_typeProjetId_idx" ON "clients_types_projet"("typeProjetId");

-- CreateIndex
CREATE INDEX "demandes_devis_companyId_idx" ON "demandes_devis"("companyId");

-- CreateIndex
CREATE INDEX "demandes_devis_clientId_idx" ON "demandes_devis"("clientId");

-- CreateIndex
CREATE INDEX "demandes_devis_statut_idx" ON "demandes_devis"("statut");

-- CreateIndex
CREATE UNIQUE INDEX "categories_prestations_companyId_nom_key" ON "categories_prestations"("companyId", "nom");

-- CreateIndex
CREATE INDEX "types_projet_categories_categorieId_idx" ON "types_projet_categories"("categorieId");

-- CreateIndex
CREATE INDEX "sous_categories_companyId_idx" ON "sous_categories"("companyId");

-- CreateIndex
CREATE INDEX "sous_categories_categorieId_idx" ON "sous_categories"("categorieId");

-- CreateIndex
CREATE UNIQUE INDEX "sous_categories_categorieId_nom_key" ON "sous_categories"("categorieId", "nom");

-- CreateIndex
CREATE INDEX "prestations_companyId_idx" ON "prestations"("companyId");

-- CreateIndex
CREATE INDEX "prestations_categorieId_idx" ON "prestations"("categorieId");

-- CreateIndex
CREATE INDEX "prestations_sousCategorieId_idx" ON "prestations"("sousCategorieId");

-- CreateIndex
CREATE INDEX "options_prestations_prestationId_idx" ON "options_prestations"("prestationId");

-- CreateIndex
CREATE UNIQUE INDEX "options_prestations_prestationId_nom_key" ON "options_prestations"("prestationId", "nom");

-- CreateIndex
CREATE INDEX "choix_options_optionId_idx" ON "choix_options"("optionId");

-- CreateIndex
CREATE UNIQUE INDEX "choix_options_optionId_nom_key" ON "choix_options"("optionId", "nom");

-- CreateIndex
CREATE INDEX "prestations_compositions_prestationId_idx" ON "prestations_compositions"("prestationId");

-- CreateIndex
CREATE INDEX "choix_options_compositions_choixOptionId_idx" ON "choix_options_compositions"("choixOptionId");

-- CreateIndex
CREATE INDEX "materiaux_companyId_idx" ON "materiaux"("companyId");

-- CreateIndex
CREATE INDEX "materiaux_fournisseurId_idx" ON "materiaux"("fournisseurId");

-- CreateIndex
CREATE INDEX "services_main_oeuvre_companyId_idx" ON "services_main_oeuvre"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "devis_reference_key" ON "devis"("reference");

-- CreateIndex
CREATE INDEX "devis_companyId_idx" ON "devis"("companyId");

-- CreateIndex
CREATE INDEX "devis_clientId_idx" ON "devis"("clientId");

-- CreateIndex
CREATE INDEX "devis_chantierId_idx" ON "devis"("chantierId");

-- CreateIndex
CREATE INDEX "devis_statut_idx" ON "devis"("statut");

-- CreateIndex
CREATE INDEX "devis_reference_idx" ON "devis"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "devis_client_signature_requests_token_key" ON "devis_client_signature_requests"("token");

-- CreateIndex
CREATE INDEX "devis_client_signature_requests_devisId_idx" ON "devis_client_signature_requests"("devisId");

-- CreateIndex
CREATE INDEX "devis_client_signature_requests_statut_idx" ON "devis_client_signature_requests"("statut");

-- CreateIndex
CREATE INDEX "devis_client_signature_requests_expiresAt_idx" ON "devis_client_signature_requests"("expiresAt");

-- CreateIndex
CREATE INDEX "versions_devis_devisId_idx" ON "versions_devis"("devisId");

-- CreateIndex
CREATE INDEX "lignes_devis_devisId_idx" ON "lignes_devis"("devisId");

-- CreateIndex
CREATE UNIQUE INDEX "factures_reference_key" ON "factures"("reference");

-- CreateIndex
CREATE INDEX "factures_devisId_idx" ON "factures"("devisId");

-- CreateIndex
CREATE INDEX "factures_statut_idx" ON "factures"("statut");

-- CreateIndex
CREATE INDEX "lignes_facture_factureId_idx" ON "lignes_facture"("factureId");

-- CreateIndex
CREATE UNIQUE INDEX "bons_commande_devisId_key" ON "bons_commande"("devisId");

-- CreateIndex
CREATE UNIQUE INDEX "bons_commande_reference_key" ON "bons_commande"("reference");

-- CreateIndex
CREATE INDEX "bons_commande_statut_idx" ON "bons_commande"("statut");

-- CreateIndex
CREATE INDEX "fournisseurs_companyId_idx" ON "fournisseurs"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "commandes_fournisseur_reference_key" ON "commandes_fournisseur"("reference");

-- CreateIndex
CREATE INDEX "commandes_fournisseur_devisId_idx" ON "commandes_fournisseur"("devisId");

-- CreateIndex
CREATE INDEX "commandes_fournisseur_fournisseurId_idx" ON "commandes_fournisseur"("fournisseurId");

-- CreateIndex
CREATE INDEX "commandes_fournisseur_statutLivraison_idx" ON "commandes_fournisseur"("statutLivraison");

-- CreateIndex
CREATE INDEX "lignes_commande_fournisseur_commandeFournisseurId_idx" ON "lignes_commande_fournisseur"("commandeFournisseurId");

-- CreateIndex
CREATE INDEX "receptions_commandeFournisseurId_idx" ON "receptions"("commandeFournisseurId");

-- CreateIndex
CREATE UNIQUE INDEX "chantiers_reference_key" ON "chantiers"("reference");

-- CreateIndex
CREATE INDEX "chantiers_companyId_idx" ON "chantiers"("companyId");

-- CreateIndex
CREATE INDEX "chantiers_clientId_idx" ON "chantiers"("clientId");

-- CreateIndex
CREATE INDEX "chantiers_statut_idx" ON "chantiers"("statut");

-- CreateIndex
CREATE INDEX "equipes_companyId_idx" ON "equipes"("companyId");

-- CreateIndex
CREATE INDEX "taches_chantierId_idx" ON "taches"("chantierId");

-- CreateIndex
CREATE INDEX "taches_statut_idx" ON "taches"("statut");

-- CreateIndex
CREATE INDEX "affectations_taches_tacheId_idx" ON "affectations_taches"("tacheId");

-- CreateIndex
CREATE INDEX "documents_chantier_chantierId_idx" ON "documents_chantier"("chantierId");

-- CreateIndex
CREATE INDEX "chat_sessions_companyId_idx" ON "chat_sessions"("companyId");

-- CreateIndex
CREATE INDEX "messages_chat_sessionId_idx" ON "messages_chat"("sessionId");

-- CreateIndex
CREATE INDEX "rag_documents_companyId_idx" ON "rag_documents"("companyId");

-- CreateIndex
CREATE INDEX "rag_documents_categorie_idx" ON "rag_documents"("categorie");

-- CreateIndex
CREATE INDEX "rag_documents_actif_idx" ON "rag_documents"("actif");

-- CreateIndex
CREATE INDEX "audit_logs_companyId_idx" ON "audit_logs"("companyId");

-- CreateIndex
CREATE INDEX "audit_logs_entite_entiteId_idx" ON "audit_logs"("entite", "entiteId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "types_projet" ADD CONSTRAINT "types_projet_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_typeProjetId_fkey" FOREIGN KEY ("typeProjetId") REFERENCES "types_projet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients_types_projet" ADD CONSTRAINT "clients_types_projet_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients_types_projet" ADD CONSTRAINT "clients_types_projet_typeProjetId_fkey" FOREIGN KEY ("typeProjetId") REFERENCES "types_projet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demandes_devis" ADD CONSTRAINT "demandes_devis_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demandes_devis" ADD CONSTRAINT "demandes_devis_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demandes_devis" ADD CONSTRAINT "demandes_devis_createurId_fkey" FOREIGN KEY ("createurId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories_prestations" ADD CONSTRAINT "categories_prestations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "types_projet_categories" ADD CONSTRAINT "types_projet_categories_categorieId_fkey" FOREIGN KEY ("categorieId") REFERENCES "categories_prestations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "types_projet_categories" ADD CONSTRAINT "types_projet_categories_typeProjetId_fkey" FOREIGN KEY ("typeProjetId") REFERENCES "types_projet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sous_categories" ADD CONSTRAINT "sous_categories_categorieId_fkey" FOREIGN KEY ("categorieId") REFERENCES "categories_prestations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prestations" ADD CONSTRAINT "prestations_categorieId_fkey" FOREIGN KEY ("categorieId") REFERENCES "categories_prestations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prestations" ADD CONSTRAINT "prestations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prestations" ADD CONSTRAINT "prestations_sousCategorieId_fkey" FOREIGN KEY ("sousCategorieId") REFERENCES "sous_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "options_prestations" ADD CONSTRAINT "options_prestations_prestationId_fkey" FOREIGN KEY ("prestationId") REFERENCES "prestations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "choix_options" ADD CONSTRAINT "choix_options_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "options_prestations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prestations_compositions" ADD CONSTRAINT "prestations_compositions_materiauId_fkey" FOREIGN KEY ("materiauId") REFERENCES "materiaux"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prestations_compositions" ADD CONSTRAINT "prestations_compositions_prestationId_fkey" FOREIGN KEY ("prestationId") REFERENCES "prestations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prestations_compositions" ADD CONSTRAINT "prestations_compositions_serviceMainOeuvreId_fkey" FOREIGN KEY ("serviceMainOeuvreId") REFERENCES "services_main_oeuvre"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "choix_options_compositions" ADD CONSTRAINT "choix_options_compositions_choixOptionId_fkey" FOREIGN KEY ("choixOptionId") REFERENCES "choix_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "choix_options_compositions" ADD CONSTRAINT "choix_options_compositions_materiauId_fkey" FOREIGN KEY ("materiauId") REFERENCES "materiaux"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "choix_options_compositions" ADD CONSTRAINT "choix_options_compositions_serviceMainOeuvreId_fkey" FOREIGN KEY ("serviceMainOeuvreId") REFERENCES "services_main_oeuvre"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materiaux" ADD CONSTRAINT "materiaux_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materiaux" ADD CONSTRAINT "materiaux_fournisseurId_fkey" FOREIGN KEY ("fournisseurId") REFERENCES "fournisseurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services_main_oeuvre" ADD CONSTRAINT "services_main_oeuvre_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devis" ADD CONSTRAINT "devis_chantierId_fkey" FOREIGN KEY ("chantierId") REFERENCES "chantiers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devis" ADD CONSTRAINT "devis_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devis" ADD CONSTRAINT "devis_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devis" ADD CONSTRAINT "devis_createurId_fkey" FOREIGN KEY ("createurId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devis" ADD CONSTRAINT "devis_demandeDevisId_fkey" FOREIGN KEY ("demandeDevisId") REFERENCES "demandes_devis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devis_client_signature_requests" ADD CONSTRAINT "devis_client_signature_requests_devisId_fkey" FOREIGN KEY ("devisId") REFERENCES "devis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "versions_devis" ADD CONSTRAINT "versions_devis_auteurId_fkey" FOREIGN KEY ("auteurId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "versions_devis" ADD CONSTRAINT "versions_devis_devisId_fkey" FOREIGN KEY ("devisId") REFERENCES "devis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lignes_devis" ADD CONSTRAINT "lignes_devis_devisId_fkey" FOREIGN KEY ("devisId") REFERENCES "devis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lignes_devis" ADD CONSTRAINT "lignes_devis_materiauId_fkey" FOREIGN KEY ("materiauId") REFERENCES "materiaux"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lignes_devis" ADD CONSTRAINT "lignes_devis_prestationId_fkey" FOREIGN KEY ("prestationId") REFERENCES "prestations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lignes_devis" ADD CONSTRAINT "lignes_devis_serviceMainOeuvreId_fkey" FOREIGN KEY ("serviceMainOeuvreId") REFERENCES "services_main_oeuvre"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "factures" ADD CONSTRAINT "factures_devisId_fkey" FOREIGN KEY ("devisId") REFERENCES "devis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lignes_facture" ADD CONSTRAINT "lignes_facture_factureId_fkey" FOREIGN KEY ("factureId") REFERENCES "factures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bons_commande" ADD CONSTRAINT "bons_commande_devisId_fkey" FOREIGN KEY ("devisId") REFERENCES "devis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fournisseurs" ADD CONSTRAINT "fournisseurs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commandes_fournisseur" ADD CONSTRAINT "commandes_fournisseur_devisId_fkey" FOREIGN KEY ("devisId") REFERENCES "devis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commandes_fournisseur" ADD CONSTRAINT "commandes_fournisseur_fournisseurId_fkey" FOREIGN KEY ("fournisseurId") REFERENCES "fournisseurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lignes_commande_fournisseur" ADD CONSTRAINT "lignes_commande_fournisseur_commandeFournisseurId_fkey" FOREIGN KEY ("commandeFournisseurId") REFERENCES "commandes_fournisseur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receptions" ADD CONSTRAINT "receptions_commandeFournisseurId_fkey" FOREIGN KEY ("commandeFournisseurId") REFERENCES "commandes_fournisseur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chantiers" ADD CONSTRAINT "chantiers_chefChantierId_fkey" FOREIGN KEY ("chefChantierId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chantiers" ADD CONSTRAINT "chantiers_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chantiers" ADD CONSTRAINT "chantiers_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipes" ADD CONSTRAINT "equipes_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "taches" ADD CONSTRAINT "taches_chantierId_fkey" FOREIGN KEY ("chantierId") REFERENCES "chantiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affectations_taches" ADD CONSTRAINT "affectations_taches_equipeId_fkey" FOREIGN KEY ("equipeId") REFERENCES "equipes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affectations_taches" ADD CONSTRAINT "affectations_taches_tacheId_fkey" FOREIGN KEY ("tacheId") REFERENCES "taches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affectations_taches" ADD CONSTRAINT "affectations_taches_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents_chantier" ADD CONSTRAINT "documents_chantier_chantierId_fkey" FOREIGN KEY ("chantierId") REFERENCES "chantiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages_chat" ADD CONSTRAINT "messages_chat_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "chat_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages_chat" ADD CONSTRAINT "messages_chat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rag_documents" ADD CONSTRAINT "rag_documents_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
