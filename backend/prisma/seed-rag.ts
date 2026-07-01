import 'dotenv/config';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

const pool = new pg.Pool({ connectionString: process.env['DATABASE_URL'] });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

const COMPANY_ID = 1;

// Chaque document a un champ "contenu" (la reponse montree au client)
// suivi d'une phrase de mots-cles/synonymes qui AIDE le matching RAG
// (le client ne verra que la partie utile grace au nettoyage, mais les
//  mots-cles augmentent le score de pertinence).

const documents = [
  // ========== DEVIS ==========
  {
    titre: 'Différence entre devis et facture',
    categorie: 'devis',
    priorite: 10,
    contenu:
      "Le devis est une proposition commerciale envoyée avant les travaux : il présente ce qui sera réalisé, à quel prix et dans quelles conditions. La facture est le document de paiement émis après accord, selon l'avancement ou la prestation réalisée. En résumé : le devis vient avant le chantier, la facture sert à facturer le chantier. Mots-cles : difference devis facture, distinction, comparaison, ecart entre devis et facture.",
  },
  {
    titre: "Durée de validité d'un devis",
    categorie: 'devis',
    priorite: 8,
    contenu:
      "Un devis a une durée de validité indiquée dessus, souvent comprise entre 1 et 3 mois. Passé ce délai, les prix peuvent être révisés car le coût des matériaux et de la main-d'œuvre évolue. Il est recommandé de confirmer votre accord avant la date d'expiration mentionnée sur le devis. Mots-cles : devis valide combien de temps, duree de validite, validite d un devis, quand le devis expire, delai de validite, periode de validite, combien de temps un devis reste valable.",
  },
  {
    titre: 'Postes inclus dans un devis de construction',
    categorie: 'devis',
    priorite: 7,
    contenu:
      "Un devis de construction détaille généralement : les travaux à réaliser, les matériaux, la main-d'œuvre, les éléments de chiffrage du chantier, et les éventuels frais annexes (préparation, protection, déplacements). Un devis bien structuré est précis et détaillé, ce qui renforce la confiance avec le client. Des modifications en cours de chantier peuvent faire l'objet d'un avenant. Mots-cles : postes inclus devis construction, elements du devis, que contient un devis, lignes du devis, composition d un devis, ce qu il y a dans un devis.",
  },
  {
    titre: 'Étapes pour calculer un devis de peinture',
    categorie: 'devis',
    priorite: 6,
    contenu:
      "Pour calculer un devis de peinture intérieure : 1) Mesurer les surfaces à peindre (murs et plafonds). 2) Déduire les ouvertures (portes et fenêtres). 3) Estimer les quantités de peinture selon le rendement et le nombre de couches. 4) Calculer la main-d'œuvre (préparation, protection, application, finitions). 5) Ajouter les frais annexes. Pour une estimation précise et personnalisée, notre équipe peut préparer votre devis. Mots-cles : comment calculer devis peinture, methode devis peinture, estimer un devis peinture, etapes devis peinture.",
  },
  {
    titre: 'Voir mes devis en cours',
    categorie: 'devis',
    priorite: 5,
    contenu:
      "Vos devis en cours sont accessibles depuis votre espace BatiCRM, dans le module dédié aux devis, où vous pouvez les créer et suivre leur avancement. Si vous souhaitez, je peux transmettre votre demande à notre équipe pour vous accompagner. Mots-cles : voir mes devis, ou trouver mes devis, liste des devis, devis en cours, consulter mes devis, retrouver mes devis.",
  },

  // ========== PRIX (JAMAIS DE CHIFFRE INVENTÉ) ==========
  {
    titre: 'Estimation de prix et budget',
    categorie: 'prix',
    priorite: 10,
    contenu:
      "Le prix d'un projet dépend de plusieurs facteurs : la surface, les matériaux choisis, la main-d'œuvre, les délais et l'ampleur des travaux. Je ne peux pas donner de chiffre précis ici, mais pour une estimation fiable et personnalisée, je peux préparer votre demande de devis : notre équipe vous recontactera rapidement. Souhaitez-vous que je lance votre demande de devis ? Mots-cles : prix, budget, cout, combien ca coute, tarif, estimation, montant, quel prix, cout total, prix travaux, budget renovation, budget construction.",
  },
  {
    titre: 'Prix au mètre carré',
    categorie: 'prix',
    priorite: 9,
    contenu:
      "Le prix au mètre carré varie selon le type de travaux, les matériaux et la complexité du chantier. Pour vous donner un montant juste plutôt qu'une estimation approximative, le mieux est d'établir un devis personnalisé. Souhaitez-vous que je prépare votre demande de devis ? Mots-cles : prix au metre carre, prix au m2, cout au m2, tarif au metre carre, prix par metre carre, combien le metre carre.",
  },
  {
    titre: "Coût de la main d'œuvre",
    categorie: 'prix',
    priorite: 7,
    contenu:
      "Le coût de la main-d'œuvre dépend du type de travaux, de leur durée et des compétences nécessaires. Pour une estimation adaptée à votre projet, notre équipe peut préparer un devis détaillé. Souhaitez-vous que je transmette votre demande ? Mots-cles : cout main d oeuvre, prix main d oeuvre, tarif ouvrier, cout horaire, prix de la pose, cout travailleurs.",
  },

  // ========== FACTURES ==========
  {
    titre: 'Comment créer une facture',
    categorie: 'factures',
    priorite: 6,
    contenu:
      "Une facture peut être créée de plusieurs façons dans BatiCRM : directement sans devis préalable, à partir d'un devis existant, ou sous forme de facture d'acompte. Vous pouvez aussi paramétrer le taux de TVA selon les besoins de votre entreprise. Pour être accompagné dans cette démarche, je peux transmettre votre demande à notre équipe. Mots-cles : comment creer une facture, faire une facture, generer une facture, emettre une facture, etablir une facture, facturation.",
  },
  {
    titre: 'Suivi des paiements clients',
    categorie: 'factures',
    priorite: 5,
    contenu:
      "Le suivi des paiements se fait depuis votre espace BatiCRM, où vous pouvez visualiser les factures, les paiements reçus et les montants en attente. Pour une mise en place adaptée à votre activité, notre équipe peut vous accompagner. Mots-cles : suivre les paiements, suivi paiement client, paiements recus, factures impayees, gestion des paiements, encaissements.",
  },

  // ========== CHANTIERS ==========
  {
    titre: "Suivre l'avancement d'un chantier",
    categorie: 'chantiers',
    priorite: 6,
    contenu:
      "Le suivi de chantier vous donne une visibilité sur l'avancée de chaque projet : états, statuts des interventions et organisation des équipes. Cela permet de garder une bonne coordination entre le terrain et le bureau. Pour découvrir comment l'utiliser sur votre activité, notre équipe peut vous guider. Mots-cles : suivre avancement chantier, suivi de chantier, avancement des travaux, progression chantier, etat du chantier, ou en est le chantier.",
  },
  {
    titre: "Statuts d'un chantier",
    categorie: 'chantiers',
    priorite: 5,
    contenu:
      "Un chantier passe généralement par plusieurs statuts qui reflètent son avancement : par exemple en préparation, en cours, en pause, ou terminé. Ces statuts permettent de suivre l'état de chaque intervention. Mots-cles : statuts chantier, etats d un chantier, phases chantier, etapes chantier, statut des travaux.",
  },
  {
    titre: 'Organiser les équipes sur un projet',
    categorie: 'chantiers',
    priorite: 5,
    contenu:
      "L'organisation des équipes passe par un planning qui répartit les ouvriers, sous-traitants et ressources par chantier. On peut planifier les tâches et interventions, gérer le temps de travail et transmettre aux équipes les informations utiles (adresse, contact, matériel). Pour une mise en place sur votre activité, notre équipe peut vous accompagner. Mots-cles : organiser mes equipes, gestion des equipes, planifier les ouvriers, repartir les equipes, planning des equipes, affecter les ouvriers, coordonner les equipes, attribuer des taches aux ouvriers.",
  },

  // ========== SERVICES / GÉNÉRAL ==========
  {
    titre: 'Nos services',
    categorie: 'services',
    priorite: 6,
    contenu:
      "BatiCRM accompagne les professionnels du bâtiment sur l'ensemble du cycle : devis, factures, suivi de chantier, gestion des équipes et des prospects. Pour connaître nos prestations disponibles, je peux vous présenter la liste de nos services ou préparer une demande de devis selon votre projet. Mots-cles : vos services, quels services, que proposez vous, prestations, ce que vous faites, vos offres, domaines d intervention.",
  },
  {
    titre: 'Demande non couverte (contact humain)',
    categorie: 'general',
    priorite: 3,
    contenu:
      "Je n'ai pas l'information précise pour répondre à cette demande. Pour ne pas vous donner une réponse erronée, le mieux est de transmettre votre question à notre équipe qui vous répondra rapidement. Souhaitez-vous que je transmette votre demande avec vos coordonnées ? Mots-cles : contact humain, parler a quelqu un, aide, autre question.",
  },
];

async function main() {
  console.log('🌱 Seed RAG v2 (enrichi) — début');

  const deleted = await prisma.ragDocument.deleteMany({
    where: { companyId: COMPANY_ID },
  });
  console.log(`🧹 ${deleted.count} ancien(s) document(s) supprimé(s)`);

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

  console.log(`✅ ${count} document(s) RAG enrichis insérés pour la company ${COMPANY_ID}`);
  console.log('🌱 Seed RAG v2 — terminé');
}

main()
  .catch((e) => {
    console.error('Erreur seed RAG :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });