import 'dotenv/config';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env['DATABASE_URL'] });

async function main() {
  console.log('Ajout de la colonne "actif" a la table clients...');

  // IF NOT EXISTS = idempotent : relancable sans erreur.
  await pool.query(
    'ALTER TABLE clients ADD COLUMN IF NOT EXISTS actif BOOLEAN NOT NULL DEFAULT true',
  );

  const { rows } = await pool.query(
    'SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE actif = true) AS actifs FROM clients',
  );
  console.log('Colonne "actif" prete. Etat des clients :', rows[0]);
}

main()
  .catch((e) => {
    console.error('Erreur :', e);
    process.exit(1);
  })
  .finally(() => pool.end());