import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import nodemailer from 'nodemailer';

function loadEnvFile() {
  try {
    const content = readFileSync(resolve(process.cwd(), '.env'), 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const separatorIndex = trimmed.indexOf('=');
      if (separatorIndex === -1) continue;

      const key = trimmed.slice(0, separatorIndex).trim();
      let value = trimmed.slice(separatorIndex + 1).trim();

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  } catch {
    console.error('Fichier backend/.env introuvable.');
    process.exit(1);
  }
}

loadEnvFile();

const host = process.env.MAIL_HOST?.trim();
const port = Number(process.env.MAIL_PORT ?? 587);
const user = process.env.MAIL_USER?.trim();
const pass = (process.env.MAIL_PASS ?? '').replace(/\s/g, '');

if (!host || !user || !pass) {
  console.error(
    'Configuration SMTP incomplete. Renseignez MAIL_HOST, MAIL_USER et MAIL_PASS dans backend/.env',
  );
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host,
  port,
  secure: port === 465,
  requireTLS: port === 587,
  auth: { user, pass },
  tls: { minVersion: 'TLSv1.2' },
});

try {
  await transporter.verify();
  console.log(`SMTP OK (${host}:${port}, user=${user})`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`SMTP KO : ${message}`);
  process.exit(1);
}
