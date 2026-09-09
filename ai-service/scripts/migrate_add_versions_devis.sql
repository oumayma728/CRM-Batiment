-- Migration non destructive pour une base ai-service déjà créée.
-- À exécuter une fois : docker exec -i devis_ia_db psql -U postgres -d devis_ia_test < scripts/migrate_add_versions_devis.sql
CREATE TABLE IF NOT EXISTS versions_devis (
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

CREATE INDEX IF NOT EXISTS "versions_devis_devisId_idx" ON versions_devis ("devisId");
