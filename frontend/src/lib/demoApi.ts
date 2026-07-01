import type { AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { demoUser, demoUsersByRole, getDemoUser } from '@/lib/demoMode';

type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

const now = '2026-06-17T09:00:00.000Z';

const clients = [
  {
    id: 1,
    nom: 'Ben Youssef',
    prenom: 'Amira',
    email: 'amira.benyoussef@example.com',
    telephone: '+216 20 111 222',
    adresseClient: '12 rue de Marseille, Tunis',
    adresseChantier: 'Villa Les Jasmins, La Marsa',
    typeProjetId: 1,
    source: 'SITE_WEB',
    besoin: 'Renovation complete cuisine et salle de bain',
    notes: 'Budget valide, visite technique planifiee.',
    actif: true,
    createdAt: '2026-05-21T10:00:00.000Z',
  },
  {
    id: 2,
    nom: 'Morel',
    prenom: 'Karim',
    email: 'karim.morel@example.com',
    telephone: '+216 22 333 444',
    adresseClient: '8 avenue Habib Bourguiba, Sousse',
    adresseChantier: 'Appartement B24, Sousse',
    typeProjetId: 2,
    source: 'RECOMMANDATION',
    besoin: 'Isolation, peinture et remise aux normes electriques',
    actif: true,
    createdAt: '2026-06-03T14:30:00.000Z',
  },
  {
    id: 3,
    nom: 'Entreprise Atlas',
    prenom: '',
    email: 'contact@atlas-demo.local',
    telephone: '+216 70 555 111',
    adresseClient: 'Zone industrielle, Ariana',
    adresseChantier: 'Local commercial Lac 2',
    typeProjetId: 3,
    source: 'APPEL',
    besoin: 'Amenagement bureaux et cloisons',
    actif: true,
    createdAt: '2026-06-10T08:20:00.000Z',
  },
];

const categories = [
  {
    id: 1,
    nom: 'Renovation interieure',
    description: 'Travaux de second oeuvre et finitions',
    _count: { prestations: 2, sousCategories: 1 },
    sousCategories: [
      {
        id: 11,
        categorieId: 1,
        nom: 'Peinture et finitions',
        description: 'Murs, plafonds et reprises',
        actif: true,
        prestations: [],
      },
    ],
  },
  {
    id: 2,
    nom: 'Electricite',
    description: 'Mise aux normes et installation',
    _count: { prestations: 1, sousCategories: 0 },
    sousCategories: [],
  },
];

const prestations = [
  {
    id: 1,
    categorieId: 1,
    sousCategorieId: 11,
    nom: 'Peinture murale premium',
    description: 'Preparation, impression et deux couches finition velours',
    unite: 'm2',
    prixVenteMin: 22,
    prixVenteMax: 38,
    actif: true,
    categorie: categories[0],
    sousCategorie: categories[0].sousCategories[0],
    compositions: [],
    options: [
      {
        id: 1,
        prestationId: 1,
        nom: 'Finition',
        obligatoire: true,
        ordre: 1,
        choix: [
          { id: 1, optionId: 1, nom: 'Velours', impactPrix: 4, actif: true, ordre: 1 },
          { id: 2, optionId: 1, nom: 'Satin', impactPrix: 7, actif: true, ordre: 2 },
        ],
      },
    ],
  },
  {
    id: 2,
    categorieId: 1,
    nom: 'Pose carrelage sol',
    description: 'Pose collee, joints et nettoyage de fin de chantier',
    unite: 'm2',
    prixVenteMin: 45,
    prixVenteMax: 72,
    actif: true,
    categorie: categories[0],
    compositions: [],
    options: [],
  },
  {
    id: 3,
    categorieId: 2,
    nom: 'Mise aux normes tableau electrique',
    description: 'Remplacement tableau, protections et etiquetage',
    unite: 'forfait',
    prixVenteMin: 680,
    prixVenteMax: 1250,
    actif: true,
    categorie: categories[1],
    compositions: [],
    options: [],
  },
];

categories[0].sousCategories[0].prestations = [prestations[0] as never];

const materiaux = [
  {
    id: 1,
    nom: 'Peinture velours blanche 15L',
    couleur: 'Blanc',
    finition: 'Velours',
    unite: 'pot',
    prixAchatFixe: 78,
    fournisseurId: 1,
    actif: true,
    createdAt: now,
  },
  {
    id: 2,
    nom: 'Carrelage gres cerame 60x60',
    couleur: 'Gris clair',
    finition: 'Mat',
    unite: 'm2',
    prixAchatFixe: 19.5,
    fournisseurId: 2,
    actif: true,
    createdAt: now,
  },
];

const servicesMo = [
  { id: 1, nom: 'Peintre qualifie', unite: 'jour', prixUnitaire: 145, productiviteJour: 45, actif: true, createdAt: now },
  { id: 2, nom: 'Electricien confirme', unite: 'jour', prixUnitaire: 185, productiviteJour: 1, actif: true, createdAt: now },
];

const fournisseurs = [
  {
    id: 1,
    nom: 'MatPro Tunis',
    contact: 'Nadia Trabelsi',
    email: 'contact@matpro-demo.local',
    telephone: '+216 71 000 111',
    adresse: 'Ariana',
    typesMateriaux: 'Peinture, outillage',
    delaiLivraison: 2,
    conditions: 'Paiement 30 jours',
    actif: true,
    _count: { materiaux: 1, commandesFournisseur: 2 },
    createdAt: now,
  },
  {
    id: 2,
    nom: 'Ceramica Plus',
    contact: 'Sami Haddad',
    email: 'devis@ceramica-demo.local',
    telephone: '+216 73 222 333',
    adresse: 'Sousse',
    typesMateriaux: 'Carrelage, sanitaires',
    delaiLivraison: 5,
    actif: true,
    _count: { materiaux: 1, commandesFournisseur: 1 },
    createdAt: now,
  },
];

const demandes = [
  {
    id: 1,
    clientId: 1,
    source: 'SITE_WEB',
    description: 'Renovation cuisine et salle de bain apres acquisition.',
    statut: 'EN_COURS',
    notes: 'Photos recues, chiffrage en preparation.',
    createdAt: '2026-06-12T09:30:00.000Z',
    client: clients[0],
  },
  {
    id: 2,
    clientId: 2,
    source: 'RECOMMANDATION',
    description: 'Rafraichissement appartement avant location.',
    statut: 'NOUVEAU',
    createdAt: '2026-06-15T16:45:00.000Z',
    client: clients[1],
  },
];

const devis = [
  {
    id: 1,
    clientId: 1,
    reference: 'DEV-2026-0142',
    versionCourante: 2,
    statut: 'ENVOYE',
    totalHT: 12480,
    totalTVA: 2496,
    totalTTC: 14976,
    tauxTVA: 20,
    coutTotal: 8940,
    profit: 3540,
    margePourcent: 28.4,
    dateEnvoi: '2026-06-14T10:00:00.000Z',
    notes: 'Demo: devis en attente de retour client.',
    createdAt: '2026-06-12T13:00:00.000Z',
    updatedAt: now,
    client: clients[0],
    createur: demoUser,
    lignes: [
      {
        id: 1,
        devisId: 1,
        prestationId: 1,
        description: 'Peinture murs et plafonds',
        quantite: 180,
        unite: 'm2',
        prixUnitaireVente: 29,
        totalHT: 5220,
        ordre: 1,
        prestation: { id: 1, nom: 'Peinture murale premium' },
      },
      {
        id: 2,
        devisId: 1,
        prestationId: 2,
        description: 'Pose carrelage cuisine',
        quantite: 42,
        unite: 'm2',
        prixUnitaireVente: 65,
        totalHT: 2730,
        ordre: 2,
        prestation: { id: 2, nom: 'Pose carrelage sol' },
      },
    ],
  },
  {
    id: 2,
    clientId: 2,
    reference: 'DEV-2026-0147',
    versionCourante: 1,
    statut: 'BROUILLON',
    totalHT: 3980,
    totalTVA: 796,
    totalTTC: 4776,
    tauxTVA: 20,
    createdAt: '2026-06-16T11:15:00.000Z',
    updatedAt: now,
    client: clients[1],
    createur: demoUser,
    lignes: [],
  },
];

const factures = [
  {
    id: 1,
    devisId: 1,
    reference: 'FAC-2026-0088',
    referenceDevis: 'DEV-2026-0142',
    date: '2026-06-15',
    dateEcheance: '2026-07-15',
    montantHT: 3744,
    montantTVA: 748.8,
    montantTTC: 4492.8,
    typeFacture: 'ACOMPTE',
    acomptePercent: 30,
    nomClient: 'Ben Youssef',
    prenomClient: 'Amira',
    emailClient: 'amira.benyoussef@example.com',
    statut: 'ENVOYEE',
    createdAt: now,
  },
];

const chantiers = [
  {
    id: 1,
    companyId: 1,
    clientId: 1,
    chefChantierId: demoUsersByRole.CHEF_CHANTIER.id,
    reference: 'CHA-2026-0031',
    adresse: 'Villa Les Jasmins, La Marsa',
    description: 'Renovation cuisine, salle de bain et peintures.',
    statut: 'DEVIS_ENVOYE',
    statutAuto: 'EN_ATTENTE',
    dateDebut: '2026-07-01',
    dateFin: '2026-07-24',
    notes: 'Demo: planning provisoire.',
    createdAt: now,
    updatedAt: now,
    client: clients[0],
    chefChantier: demoUsersByRole.CHEF_CHANTIER,
    resumeTaches: { total: 6, done: 1, pending: 5, overdue: 0 },
    _count: { devis: 1, taches: 6, documents: 2 },
  },
];

const commandes = [
  {
    id: 1,
    devisId: 1,
    fournisseurId: 1,
    reference: 'CF-2026-0044',
    date: '2026-06-16',
    statutLivraison: 'ENVOYEE',
    dateEnvoi: '2026-06-16',
    dateLivraisonPrevue: '2026-06-20',
    notes: 'Commande de demonstration',
    createdAt: now,
    updatedAt: now,
    fournisseur: fournisseurs[0],
    lignes: [
      { id: 1, materiauNom: 'Peinture velours blanche 15L', quantite: 8, unite: 'pot', prixUnitaire: 78, totalHT: 624 },
    ],
    devis: {
      id: 1,
      reference: 'DEV-2026-0142',
      statut: 'ENVOYE',
      client: clients[0],
      chantier: { id: 1, reference: 'CHA-2026-0031', adresse: 'Villa Les Jasmins, La Marsa', statut: 'DEVIS_ENVOYE' },
    },
    receptions: [],
    tracking: {
      disponibilite: { state: 'COMPLETE', label: 'Disponible', detail: 'Stock confirme' },
      livraison: { state: 'EN_COURS', label: 'En livraison', detail: 'Livraison prevue le 20/06' },
      reception: { state: 'EN_ATTENTE', label: 'Reception', detail: 'En attente' },
    },
    metrics: { lignesCount: 1, totalMontantHT: 624, totalQuantiteCommandee: 8, totalQuantiteRecue: 0, receptionPercent: 0 },
  },
];

const typeProjets = [
  { id: 1, nom: 'Renovation maison', description: 'Renovation partielle ou complete', actif: true, createdAt: now, _count: { clients: 12, categories: 2 } },
  { id: 2, nom: 'Appartement locatif', description: 'Remise en etat avant location', actif: true, createdAt: now, _count: { clients: 8, categories: 2 } },
  { id: 3, nom: 'Local professionnel', description: 'Amenagement commerce ou bureaux', actif: true, createdAt: now, _count: { clients: 5, categories: 1 } },
];

const users = [
  demoUsersByRole.ADMIN,
  demoUsersByRole.ASSISTANTE,
  demoUsersByRole.CHEF_CHANTIER,
  demoUsersByRole.TECHNICO,
  demoUsersByRole.SOUS_TRAITANT,
];

const ragDocuments = [
  { id: 1, titre: 'Regles de chiffrage peinture', categorie: 'Chiffrage', contenu: 'Exemple demo.', actif: true, priorite: 10, createdAt: now, updatedAt: now },
  { id: 2, titre: 'Questions visite technique', categorie: 'Commercial', contenu: 'Checklist demo.', actif: true, priorite: 7, createdAt: now, updatedAt: now },
];

const paginate = <T>(data: T[], config: AxiosRequestConfig) => {
  const page = Number(config.params?.page ?? 1);
  const limit = Number(config.params?.limit ?? (data.length || 20));
  const start = (page - 1) * limit;

  return {
    data: data.slice(start, start + limit),
    meta: {
      total: data.length,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(data.length / limit)),
    },
  };
};

const response = (config: AxiosRequestConfig, data: unknown, status = 200): AxiosResponse => ({
  data,
  status,
  statusText: status === 200 ? 'OK' : 'Demo',
  headers: {},
  config: config as InternalAxiosRequestConfig,
});

const readonlyError = (config: AxiosRequestConfig) => {
  const error = new Error('Mode demo: les modifications sont desactivees.') as Error & {
    isAxiosError: boolean;
    response: AxiosResponse;
    config: AxiosRequestConfig;
  };
  error.isAxiosError = true;
  error.config = config;
  error.response = response(
    config,
    { message: 'Mode demo securise: aucune modification reelle ne peut etre enregistree.' },
    403,
  );
  return error;
};

const findById = <T extends { id: number }>(items: T[], url: string) => {
  const id = Number(url.match(/\/(\d+)(?:\/|$)/)?.[1]);
  return items.find((item) => item.id === id) ?? items[0] ?? null;
};

export const createDemoApiResponse = async (config: AxiosRequestConfig): Promise<AxiosResponse> => {
  const method = (config.method ?? 'get').toLowerCase() as HttpMethod;
  const rawUrl = config.url ?? '/';
  const url = rawUrl.split('?')[0];

  await new Promise((resolve) => setTimeout(resolve, 180));

  if (method !== 'get') {
    throw readonlyError(config);
  }

  if (url === '/auth/profile') return response(config, getDemoUser());
  if (url === '/conseiller/signature') return response(config, { signatureBase64: '', updatedAt: null });
  if (url === '/users') return response(config, users);
  if (url === '/clients') return response(config, paginate(clients, config));
  if (url.startsWith('/clients/')) return response(config, findById(clients, url));
  if (url === '/demandes-devis') return response(config, paginate(demandes, config));
  if (url.startsWith('/demandes-devis/')) return response(config, findById(demandes, url));
  if (url === '/devis') return response(config, paginate(devis, config));
  if (url.match(/^\/devis\/\d+$/)) return response(config, findById(devis, url));
  if (url.match(/^\/devis\/\d+\/signature$/)) return response(config, findById(devis, url));
  if (url === '/factures') return response(config, paginate(factures, config));
  if (url === '/factures/devis-sources') return response(config, paginate(devis, config));
  if (url.startsWith('/factures/')) return response(config, { ...factures[0], lignes: [], editable: false, linkedDevis: { id: 1, reference: 'DEV-2026-0142', statut: 'ENVOYE' }, devis: devis[0] });
  if (url === '/chantiers') return response(config, paginate(chantiers, config));
  if (url === '/chantiers/assignation-options') return response(config, { sousTraitants: [], equipesInternes: [{ id: 1, nom: 'Equipe demo', type: 'INTERNE' }] });
  if (url.match(/^\/chantiers\/\d+\/taches$/)) {
    return response(config, {
      chantierId: 1,
      chantierReference: 'CHA-2026-0031',
      client: clients[0],
      chantierStatutAuto: 'EN_ATTENTE',
      resumeTaches: { total: 2, done: 1, pending: 1, overdue: 0 },
      tasks: [
        { id: 1, chantierId: 1, libelle: 'Protections chantier', statut: 'TERMINEE', avancement: 100, ordre: 1, done: true, createdAt: now, updatedAt: now },
        { id: 2, chantierId: 1, libelle: 'Preparation supports', statut: 'A_FAIRE', avancement: 0, ordre: 2, done: false, createdAt: now, updatedAt: now },
      ],
    });
  }
  if (url === '/prestations') return response(config, { data: prestations, total: prestations.length });
  if (url === '/prestations/catalogue' || url === '/prestations/catalogue-complet') {
    return response(config, categories.map((category) => ({ ...category, prestations: prestations.filter((item) => item.categorieId === category.id) })));
  }
  if (url === '/prestations/categories') return response(config, categories);
  if (url === '/prestations/admin/chiffrage-settings') return response(config, { margeDefautPourcent: 30, tauxTVADefaut: 20, fraisGenerauxPourcent: 12 });
  if (url === '/prestations/admin/catalogue-publication-status') return response(config, { published: true, lastPublishedAt: now });
  if (url === '/prestations/admin/catalogue-publication-history') return response(config, []);
  if (url === '/prestations/admin/catalogue-validation') return response(config, { errors: [], warnings: [], valid: true });
  if (url === '/materiaux') return response(config, paginate(materiaux, config));
  if (url === '/services-mo') return response(config, paginate(servicesMo, config));
  if (url === '/fournisseurs') return response(config, { data: fournisseurs, meta: { total: fournisseurs.length, page: 1, limit: fournisseurs.length, totalPages: 1 }, total: fournisseurs.length });
  if (url === '/types-projet') return response(config, typeProjets);
  if (url === '/rag/documents') return response(config, paginate(ragDocuments, config));
  if (url === '/notifications/internal') {
    return response(config, {
      items: [
        { id: 1, action: 'DEMO_READY', createdAt: now, entite: 'demo', entiteId: 1, title: 'Mode demo actif', message: 'Les donnees affichees sont fictives.', category: 'demo', level: 'info', metadata: {}, actor: null },
      ],
      summary: { total: 1, supplierUpdates: 0, receptionsPartielles: 0, receptionsCompletes: 0 },
    });
  }
  if (url === '/assistant/admin/prospects') return response(config, demandes);
  if (url === '/assistant/admin/projets-futurs') return response(config, []);
  if (url === '/commandes-fournisseur') return response(config, paginate(commandes, config));
  if (url.startsWith('/commandes-fournisseur/')) return response(config, commandes[0]);
  if (url === '/portail-fournisseur/dashboard') {
    return response(config, { fournisseur: fournisseurs[0], summary: { totalCommandes: 1, aConfirmer: 0, enCoursLivraison: 1, receptionsPartielles: 0, receptionsCompletes: 0, montantTotalHT: 624 }, recentOrders: commandes });
  }
  if (url === '/portail-fournisseur/commandes' || url === '/portail-fournisseur/orders') {
    return response(config, paginate(commandes, config));
  }
  if (url.startsWith('/portail-fournisseur/commandes/') || url.startsWith('/portail-fournisseur/orders/')) {
    return response(config, commandes[0]);
  }

  return response(config, {});
};
