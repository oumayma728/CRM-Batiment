import 'dotenv/config';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

const pool = new pg.Pool({ connectionString: process.env['DATABASE_URL'] });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

const COMPANY_ID = 1;

const documents = [
  // ========== DEVIS ==========
  {
    titre: 'Différence entre devis et facture',
    categorie: 'devis',
    priorite: 10,
    contenu:
      "Le devis est une proposition commerciale envoyée avant les travaux : il présente ce qui sera réalisé, à quel prix et dans quelles conditions. La facture est le document de paiement émis après accord, selon l'avancement ou la prestation réalisée. En résumé : le devis vient avant le chantier, la facture sert à facturer le chantier.",
  },
  {
    titre: "Durée de validité d'un devis",
    categorie: 'devis',
    priorite: 8,
    contenu:
      "Un devis a une durée de validité indiquée dessus, souvent comprise entre 1 et 3 mois. Passé ce délai, les prix peuvent être révisés car le coût des matériaux et de la main-d'œuvre évolue. Il est recommandé de confirmer votre accord avant la date d'expiration mentionnée sur le devis.",
  },
  {
    titre: 'Postes inclus dans un devis de construction',
    categorie: 'devis',
    priorite: 7,
    contenu:
      "Un devis de construction détaille généralement : les travaux à réaliser, les matériaux, la main-d'œuvre, les éléments de chiffrage du chantier, et les éventuels frais annexes (préparation, protection, déplacements). Un devis bien structuré est précis et détaillé, ce qui renforce la confiance avec le client. Des modifications en cours de chantier peuvent faire l'objet d'un avenant.",
  },
  {
    titre: 'Étapes pour calculer un devis de peinture',
    categorie: 'devis',
    priorite: 6,
    contenu:
      "Pour calculer un devis de peinture intérieure : 1) Mesurer les surfaces à peindre (murs et plafonds). 2) Déduire les ouvertures (portes et fenêtres). 3) Estimer les quantités de peinture selon le rendement et le nombre de couches. 4) Calculer la main-d'œuvre (préparation, protection, application, finitions). 5) Ajouter les frais annexes. Pour une estimation précise et personnalisée, notre équipe peut préparer votre devis.",
  },
  {
    titre: 'Voir mes devis en cours',
    categorie: 'devis',
    priorite: 5,
    contenu:
      "Vos devis en cours sont accessibles depuis votre espace BatiCRM, dans le module dédié aux devis, où vous pouvez les créer et suivre leur avancement. Si vous souhaitez, je peux transmettre votre demande à notre équipe pour vous accompagner.",
  },

  // ========== PRIX (JAMAIS DE CHIFFRE INVENTÉ) ==========
  {
    titre: 'Estimation de prix et budget',
    categorie: 'prix',
    priorite: 10,
    contenu:
      "Le prix d'un projet dépend de plusieurs facteurs : la surface, les matériaux choisis, la main-d'œuvre, les délais et l'ampleur des travaux. Je ne peux pas donner de chiffre précis ici, mais pour une estimation fiable et personnalisée, je peux préparer votre demande de devis : notre équipe vous recontactera rapidement. Souhaitez-vous que je lance votre demande de devis ?",
  },
  {
    titre: 'Prix au mètre carré',
    categorie: 'prix',
    priorite: 9,
    contenu:
      "Le prix au mètre carré varie selon le type de travaux, les matériaux et la complexité du chantier. Pour vous donner un montant juste plutôt qu'une estimation approximative, le mieux est d'établir un devis personnalisé. Souhaitez-vous que je prépare votre demande de devis ?",
  },
  {
    titre: "Coût de la main d'œuvre",
    categorie: 'prix',
    priorite: 7,
    contenu:
      "Le coût de la main-d'œuvre dépend du type de travaux, de leur durée et des compétences nécessaires. Pour une estimation adaptée à votre projet, notre équipe peut préparer un devis détaillé. Souhaitez-vous que je transmette votre demande ?",
  },

  // ========== FACTURES ==========
  {
    titre: 'Comment créer une facture',
    categorie: 'factures',
    priorite: 6,
    contenu:
      "Une facture peut être créée de plusieurs façons dans BatiCRM : directement sans devis préalable, à partir d'un devis existant, ou sous forme de facture d'acompte. Vous pouvez aussi paramétrer le taux de TVA selon les besoins de votre entreprise. Pour être accompagné dans cette démarche, je peux transmettre votre demande à notre équipe.",
  },
  {
    titre: 'Suivi des paiements clients',
    categorie: 'factures',
    priorite: 5,
    contenu:
      "Le suivi des paiements se fait depuis votre espace BatiCRM, où vous pouvez visualiser les factures, les paiements reçus et les montants en attente. Pour une mise en place adaptée à votre activité, notre équipe peut vous accompagner.",
  },

  // ========== CHANTIERS ==========
  {
    titre: "Suivre l'avancement d'un chantier",
    categorie: 'chantiers',
    priorite: 6,
    contenu:
      "Le suivi de chantier vous donne une visibilité sur l'avancée de chaque projet : états, statuts des interventions et organisation des équipes. Cela permet de garder une bonne coordination entre le terrain et le bureau. Pour découvrir comment l'utiliser sur votre activité, notre équipe peut vous guider.",
  },
  {
    titre: "Statuts d'un chantier",
    categorie: 'chantiers',
    priorite: 5,
    contenu:
      "Un chantier passe généralement par plusieurs statuts qui reflètent son avancement : par exemple en préparation, en cours, en pause, ou terminé. Ces statuts permettent de suivre l'état de chaque intervention et d'organiser le travail des équipes.",
  },
  {
    titre: 'Organiser les équipes sur un projet',
    categorie: 'chantiers',
    priorite: 4,
    contenu:
      "L'organisation des équipes passe par un planning qui répartit les ouvriers, sous-traitants et ressources par chantier. On peut planifier les tâches et interventions, gérer le temps de travail et transmettre aux équipes les informations utiles (adresse, contact, matériel). Pour une mise en place sur votre activité, notre équipe peut vous accompagner.",
  },

  // ========== SERVICES / GÉNÉRAL ==========
  {
    titre: 'Nos services',
    categorie: 'services',
    priorite: 6,
    contenu:
      "BatiCRM accompagne les professionnels du bâtiment sur l'ensemble du cycle : devis, factures, suivi de chantier, gestion des équipes et des prospects. Pour connaître nos prestations disponibles, je peux vous présenter la liste de nos services ou préparer une demande de devis selon votre projet.",
  },
  {
    titre: 'Demande non couverte (contact humain)',
    categorie: 'general',
    priorite: 3,
    contenu:
      "Je n'ai pas l'information précise pour répondre à cette demande. Pour ne pas vous donner une réponse erronée, le mieux est de transmettre votre question à notre équipe qui vous répondra rapidement. Souhaitez-vous que je transmette votre demande avec vos coordonnées ?",
  },
];

async function main() {
  console.log('🌱 Seed RAG — début');

  // 1) On nettoie les anciens documents de cette company (pour éviter les doublons)
  const deleted = await prisma.ragDocument.deleteMany({
    where: { companyId: COMPANY_ID },
  });
  console.log(`🧹 ${deleted.count} ancien(s) document(s) supprimé(s)`);

  // 2) On insère les nouveaux documents
  let count = 0;
  for (const doc of documents) {
    await prisma.ragDocument.create({
      data: {
        companyId: COMPANY_ID,
        titre: doc.titre,
        categorie: doc.categorie,
        contenu: doc.contenu,
        actif: true,
        priorite: doc.priorite,
      },
    });
    count++;
  }

  console.log(` ${count} document(s) RAG inséré(s) pour la company ${COMPANY_ID}`);
  console.log('🌱 Seed RAG — terminé');
}

main()
  .catch((e) => {
    console.error(' Erreur seed RAG :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });