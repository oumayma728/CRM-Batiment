// ============================================================
// JEU DE VALIDATION RAG — ~45 questions client reformulees.
//
// POURQUOI ce fichier ?
// Le cahier des charges (sous-tache 3) exige de re-valider ~45 questions
// en comparaison AVANT (lexical seul) / APRES (hybride). L'ancien fichier
// TABLEAU-VALIDATION n'a jamais ete committe -> on le reconstruit ICI et
// on le versionne cette fois.
//
// REGLE DE CONSTRUCTION : chaque question EVITE volontairement les mots du
// titre du document cible. Une question qui reprend les mots du titre ne
// teste que le lexical ; on veut tester si l'HYBRIDE retrouve le bon doc
// malgre des mots differents (le vrai apport du semantique).
//
// expectedDocId = l'id EXACT du bon document (table rag_documents).
//   On verifie par id, pas par mots, pour un verdict sans ambiguite.
// ============================================================

export type ValidationQuestion = {
  /** La question telle qu'un client la taperait (reformulee, parfois fautive). */
  question: string;
  /** id du document attendu en tete (colonne id de rag_documents). */
  expectedDocId: number;
  /** Mot-cle lisible du theme, pour l'affichage du rapport. */
  expectedTheme: string;
  /** Categorie metier, pour le bilan par theme. */
  theme:
    | 'Prix'
    | 'Devis'
    | 'Mesures'
    | 'Chantier'
    | 'Factures'
    | 'Services'
    | 'Contact';
};

export const VALIDATION_QUESTIONS: ValidationQuestion[] = [
  // ---------- PRIX (docs 170, 171, 172) ----------
  { question: 'combien ca coute de refaire ma maison', expectedDocId: 170, expectedTheme: 'Estimation prix', theme: 'Prix' },
  { question: 'ca revient a combien les travaux', expectedDocId: 170, expectedTheme: 'Estimation prix', theme: 'Prix' },
  { question: 'quel est le budget a prevoir pour une renovation', expectedDocId: 170, expectedTheme: 'Estimation prix', theme: 'Prix' },
  { question: 'tarif au metre carre', expectedDocId: 171, expectedTheme: 'Prix au m2', theme: 'Prix' },
  { question: 'combien vous prenez par m2', expectedDocId: 171, expectedTheme: 'Prix au m2', theme: 'Prix' },
  { question: 'combien coute un ouvrier', expectedDocId: 172, expectedTheme: 'Cout main oeuvre', theme: 'Prix' },
  { question: 'prix de la main d oeuvre', expectedDocId: 172, expectedTheme: 'Cout main oeuvre', theme: 'Prix' },

  // ---------- DEVIS (docs 159, 160, 161, 162, 163, 164, 165) ----------
  { question: 'c est quoi la difference entre un devis et une facture', expectedDocId: 159, expectedTheme: 'Devis vs facture', theme: 'Devis' },
  { question: 'un devis et une facture c est pareil', expectedDocId: 159, expectedTheme: 'Devis vs facture', theme: 'Devis' },
  { question: 'combien de temps mon offre reste valable', expectedDocId: 160, expectedTheme: 'Validite devis', theme: 'Devis' },
  { question: 'je veux connaitre le delai de validite d une proposition commerciale', expectedDocId: 160, expectedTheme: 'Validite devis', theme: 'Devis' },
  { question: 'pendant combien de jours ma proposition tient', expectedDocId: 160, expectedTheme: 'Validite devis', theme: 'Devis' },
  { question: 'qu est ce qui est compris dans un devis de construction', expectedDocId: 161, expectedTheme: 'Postes devis', theme: 'Devis' },
  { question: 'comment on chiffre des travaux de peinture', expectedDocId: 162, expectedTheme: 'Devis peinture', theme: 'Devis' },
  { question: 'ou voir mes propositions en cours', expectedDocId: 163, expectedTheme: 'Voir devis', theme: 'Devis' },
  { question: 'je veux changer un devis deja fait', expectedDocId: 164, expectedTheme: 'Modifier devis', theme: 'Devis' },
  { question: 'ca veut dire quoi HT et TTC', expectedDocId: 165, expectedTheme: 'HT TTC', theme: 'Devis' },

  // ---------- MESURES (docs 166, 167, 168, 169) ----------
  { question: 'comment on mesure la surface d une piece', expectedDocId: 166, expectedTheme: 'Surface', theme: 'Mesures' },
  { question: 'caltuler la superficie d un mur', expectedDocId: 166, expectedTheme: 'Surface', theme: 'Mesures' },
  { question: 'comment savoir le nombre de m2 d une chambre', expectedDocId: 166, expectedTheme: 'Surface', theme: 'Mesures' },
  { question: 'comment calculer combien de m3 dans une piece', expectedDocId: 167, expectedTheme: 'Volume', theme: 'Mesures' },
  { question: 'mesurer un toit en pente', expectedDocId: 168, expectedTheme: 'Toiture', theme: 'Mesures' },
  { question: 'combien de materiaux il me faut', expectedDocId: 169, expectedTheme: 'Quantites', theme: 'Mesures' },

  // ---------- CHANTIER (docs 179, 180, 181, 182, 183, 184, 185) ----------
  { question: 'ou en est mon projet de travaux', expectedDocId: 179, expectedTheme: 'Avancement', theme: 'Chantier' },
  { question: 'comment suivre l evolution de mes travaux', expectedDocId: 179, expectedTheme: 'Avancement', theme: 'Chantier' },
  { question: 'quels sont les differents etats d un chantier', expectedDocId: 180, expectedTheme: 'Statuts', theme: 'Chantier' },
  { question: 'comment repartir mes ouvriers sur un projet', expectedDocId: 181, expectedTheme: 'Equipes', theme: 'Chantier' },
  { question: 'gerer plusieurs projets en meme temps', expectedDocId: 182, expectedTheme: 'Multi chantiers', theme: 'Chantier' },
  { question: 'ajouter des images a un chantier', expectedDocId: 183, expectedTheme: 'Photos', theme: 'Chantier' },
  { question: 'comment gerer mes fournisseurs', expectedDocId: 184, expectedTheme: 'Fournisseurs', theme: 'Chantier' },
  { question: 'quelles sont les phases d une construction', expectedDocId: 185, expectedTheme: 'Etapes construction', theme: 'Chantier' },

  // ---------- FACTURES (docs 173, 174, 175, 176, 177, 178) ----------
  { question: 'comment je fais une facture', expectedDocId: 173, expectedTheme: 'Creer facture', theme: 'Factures' },
  { question: 'envoyer une facture au client par mail', expectedDocId: 174, expectedTheme: 'Envoyer facture', theme: 'Factures' },
  { question: 'comment dire qu une facture est reglee', expectedDocId: 175, expectedTheme: 'Facture payee', theme: 'Factures' },
  { question: 'un client a paye une partie seulement', expectedDocId: 176, expectedTheme: 'Acomptes', theme: 'Factures' },
  { question: 'comment suivre qui m a paye', expectedDocId: 177, expectedTheme: 'Suivi paiements', theme: 'Factures' },
  { question: 'voir combien j ai gagne ce mois', expectedDocId: 178, expectedTheme: 'Revenus', theme: 'Factures' },

  // ---------- SERVICES (doc 186) ----------
  { question: 'qu est ce que vous proposez comme prestations', expectedDocId: 186, expectedTheme: 'Services', theme: 'Services' },
  { question: 'vous faites quoi comme travaux', expectedDocId: 186, expectedTheme: 'Services', theme: 'Services' },

  // ---------- CONTACT / GENERAL (doc 187) ----------
  { question: 'je veux parler a un vrai conseiller', expectedDocId: 187, expectedTheme: 'Contact humain', theme: 'Contact' },
  { question: 'est ce que je peux joindre quelqu un de votre equipe', expectedDocId: 187, expectedTheme: 'Contact humain', theme: 'Contact' },
];