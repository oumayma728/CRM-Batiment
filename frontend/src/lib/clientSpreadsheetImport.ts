import type { LeadSource } from '@/types';

export interface ClientImportPayload {
  nom: string;
  prenom?: string;
  email?: string;
  telephone?: string;
  adresseClient?: string;
  adresseChantier?: string;
  source?: LeadSource;
  besoin?: string;
  notes?: string;
}

export interface SpreadsheetClientRow {
  rowNumber: number;
  payload: ClientImportPayload;
}

export interface SpreadsheetInvalidRow {
  rowNumber: number;
  reason: string;
}

export interface SpreadsheetParseResult {
  rows: SpreadsheetClientRow[];
  skippedRows: number;
  invalidRows: SpreadsheetInvalidRow[];
}

type MappedField = keyof ClientImportPayload;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FIELD_ALIASES: Record<string, MappedField> = {
  nom: 'nom',
  lastname: 'nom',
  surname: 'nom',
  familyname: 'nom',
  nomdefamille: 'nom',
  prenom: 'prenom',
  prenon: 'prenom',
  firstname: 'prenom',
  givenname: 'prenom',
  email: 'email',
  emeail: 'email',
  mail: 'email',
  courriel: 'email',
  telephone: 'telephone',
  tel: 'telephone',
  numerodetelephone: 'telephone',
  numerotel: 'telephone',
  phone: 'telephone',
  mobile: 'telephone',
  adresse: 'adresseClient',
  adresseclient: 'adresseClient',
  adressefacturation: 'adresseClient',
  chantier: 'adresseChantier',
  adressechantier: 'adresseChantier',
  adresseprojet: 'adresseChantier',
  source: 'source',
  provenance: 'source',
  canal: 'source',
  besoin: 'besoin',
  demandeduclient: 'besoin',
  objectif: 'besoin',
  notes: 'notes',
  note: 'notes',
  commentaire: 'notes',
  commentaires: 'notes',
  observation: 'notes',
  observations: 'notes',
};

const LEAD_SOURCE_ALIASES: Record<string, LeadSource> = {
  chatbot: 'CHATBOT',
  technicocommercial: 'TECHNICO_COMMERCIAL',
  technico: 'TECHNICO_COMMERCIAL',
  appel: 'APPEL',
  appeltel: 'APPEL',
  appeltelephonique: 'APPEL',
  recommandation: 'RECOMMANDATION',
  recommendation: 'RECOMMANDATION',
  siteweb: 'SITE_WEB',
  web: 'SITE_WEB',
  website: 'SITE_WEB',
  autre: 'AUTRE',
};

function normalizeToken(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function toOptionalString(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  const text = String(value).trim();
  if (!text) return undefined;
  if (text.toLowerCase() === 'null' || text.toLowerCase() === 'undefined') return undefined;
  return text;
}

function resolveField(header: string): MappedField | undefined {
  return FIELD_ALIASES[normalizeToken(header)];
}

function normalizeLeadSource(value: string): LeadSource | undefined {
  const normalized = normalizeToken(value);
  if (!normalized) return undefined;
  if (normalized in LEAD_SOURCE_ALIASES) {
    return LEAD_SOURCE_ALIASES[normalized];
  }
  const upper = value.toUpperCase().trim() as LeadSource;
  if (
    upper === 'CHATBOT' ||
    upper === 'TECHNICO_COMMERCIAL' ||
    upper === 'APPEL' ||
    upper === 'RECOMMANDATION' ||
    upper === 'SITE_WEB' ||
    upper === 'AUTRE'
  ) {
    return upper;
  }
  return undefined;
}

export async function parseClientsSpreadsheet(file: File): Promise<SpreadsheetParseResult> {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error('Le fichier est vide.');
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: false,
  });

  const rows: SpreadsheetClientRow[] = [];
  const invalidRows: SpreadsheetInvalidRow[] = [];
  let skippedRows = 0;

  rawRows.forEach((rawRow, index) => {
    const rowNumber = index + 2;
    const draft: Partial<ClientImportPayload> = {};
    let hasMappedValue = false;

    Object.entries(rawRow).forEach(([header, rawValue]) => {
      const field = resolveField(header);
      if (!field) return;

      const value = toOptionalString(rawValue);
      if (!value) return;
      hasMappedValue = true;

      if (field === 'source') {
        const source = normalizeLeadSource(value);
        if (source) draft.source = source;
        return;
      }

      draft[field] = value as never;
    });

    if (!hasMappedValue) {
      skippedRows += 1;
      return;
    }

    if (!draft.nom) {
      invalidRows.push({ rowNumber, reason: 'Nom manquant.' });
      return;
    }

    if (draft.email && !EMAIL_PATTERN.test(draft.email)) {
      invalidRows.push({ rowNumber, reason: 'Email invalide.' });
      return;
    }

    rows.push({
      rowNumber,
      payload: {
        nom: draft.nom,
        prenom: draft.prenom,
        email: draft.email,
        telephone: draft.telephone,
        adresseClient: draft.adresseClient,
        adresseChantier: draft.adresseChantier,
        source: draft.source,
        besoin: draft.besoin,
        notes: draft.notes,
      },
    });
  });

  return { rows, skippedRows, invalidRows };
}

export function getImportErrorMessage(error: unknown, fallback: string): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof error.response === 'object' &&
    error.response !== null &&
    'data' in error.response &&
    typeof error.response.data === 'object' &&
    error.response.data !== null &&
    'message' in error.response.data
  ) {
    const apiMessage = error.response.data.message;
    if (Array.isArray(apiMessage)) return apiMessage.join(', ');
    if (typeof apiMessage === 'string') return apiMessage;
  }

  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
