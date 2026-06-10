import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import { fileURLToPath } from 'node:url';

const connectionString = process.env['DATABASE_URL'];

if (!connectionString) {
  throw new Error('DATABASE_URL is required to apply migrations');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.join(__dirname, 'migrations');

const pool = new pg.Pool({ connectionString });
const client = await pool.connect();

try {
  const entries = await fs.readdir(migrationsDir, { withFileTypes: true });
  const migrationFolders = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  for (const folderName of migrationFolders) {
    const migrationPath = path.join(migrationsDir, folderName, 'migration.sql');

    try {
      await fs.access(migrationPath);
    } catch {
      continue;
    }

    const migrationSql = await fs.readFile(migrationPath, 'utf8');

    if (!migrationSql.trim()) {
      continue;
    }

    console.log(`Applying migration ${folderName}`);
    await client.query('BEGIN');
    try {
      await client.query(migrationSql);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  }

  console.log('All migrations applied successfully.');
} finally {
  client.release();
  await pool.end();
}