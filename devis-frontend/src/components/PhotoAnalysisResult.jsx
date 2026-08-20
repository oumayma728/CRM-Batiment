import React from "react";

// Zone secondaire d'affichage des resultats de POST /api/devis/photo-analyze.
// Spec exacte : badge type_pièce, surface + icone warning si confidence < 0.7,
// liste materiaux en badges couleur, bouton "Valider -> Edit Devis".
//
// Le bouton declenche onValiderEditDevis(resultat) -- la navigation/ouverture
// de l'ecran "Edit Devis" lui-meme est geree par le composant parent, hors
// perimetre de cette sous-tache (affichage uniquement).

const SEUIL_CONFIANCE_SURFACE = 0.7;

// Palette cyclique pour distinguer visuellement les materiaux -- pas de
// categorisation reelle disponible cote API, simple rotation de couleurs.
const COULEURS_BADGES = [
  "bg-blue-100 text-blue-800",
  "bg-purple-100 text-purple-800",
  "bg-teal-100 text-teal-800",
  "bg-orange-100 text-orange-800",
  "bg-pink-100 text-pink-800",
  "bg-indigo-100 text-indigo-800",
];

function IconeWarning() {
  return (
    <svg
      className="w-4 h-4 text-amber-500 shrink-0"
      fill="currentColor"
      viewBox="0 0 20 20"
      aria-label="Confiance faible"
    >
      <path
        fillRule="evenodd"
        d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.516-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default function PhotoAnalysisResult({ resultat, onValiderEditDevis, onBasculerVersTexte }) {
  if (!resultat) return null;

  const {
    type_pièce,
    surface_m2,
    confidence_surface,
    matériaux,
    reference_visible,
    photo_floue,
    avertissement_extraction,
    objet_compte,
    nombre_unites_estimee,
  } = resultat;
  const confianceFaible = confidence_surface < SEUIL_CONFIANCE_SURFACE;

  // Photo floue (cahier des charges P1) : pas de carte de resultat normale,
  // on redirige explicitement vers l'onglet Texte.
  if (photo_floue) {
    return (
      <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <IconeWarning />
          <h3 className="text-sm font-semibold text-amber-800">
            Photo trop floue
          </h3>
        </div>
        <p className="text-sm text-amber-700">
          {avertissement_extraction ||
            "Cette photo est trop floue pour être analysée automatiquement."}
        </p>
        <button
          onClick={() => onBasculerVersTexte && onBasculerVersTexte()}
          type="button"
          className="w-full bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg py-2.5 transition-colors flex items-center justify-center gap-2"
        >
          Décrire les travaux via l'onglet Texte
          <span aria-hidden="true">→</span>
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-lg border border-slate-200 bg-white p-5 space-y-4">
      <h3 className="text-sm font-semibold text-slate-700 tracking-wide uppercase">
        Résultat de l'analyse
      </h3>

      {/* Badge type_piece */}
      <div>
        <p className="text-xs text-slate-400 mb-1.5">Type de pièce / zone</p>
        <span className="inline-block text-sm font-medium bg-slate-800 text-white px-3 py-1 rounded-full">
          {type_pièce}
        </span>
      </div>

      {/* Surface + icone warning si confidence < 0.7 */}
      <div>
        <p className="text-xs text-slate-400 mb-1.5">Surface estimée</p>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-800">
            {surface_m2 !== null && surface_m2 !== undefined
              ? `${surface_m2} m²`
              : "Non déterminée"}
          </span>
          {confianceFaible && <IconeWarning />}
        </div>
        {confianceFaible && (
          <p className="text-xs text-amber-600 mt-1">
            Confiance faible ({Math.round(confidence_surface * 100)}%) — à
            vérifier avant de valider.
          </p>
        )}
      </div>

      {/* Quantite estimee (elements factures a l'unite : fenetres, portes, ...) */}
      {objet_compte && nombre_unites_estimee !== null && nombre_unites_estimee !== undefined && (
        <div>
          <p className="text-xs text-slate-400 mb-1.5">Quantité estimée</p>
          <span className="inline-block text-sm font-medium bg-slate-800 text-white px-3 py-1 rounded-full">
            {nombre_unites_estimee} {objet_compte}
          </span>
        </div>
      )}

      {/* Materiaux en badges couleur */}
      <div>
        <p className="text-xs text-slate-400 mb-1.5">Matériaux identifiés</p>
        {matériaux && matériaux.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5">
            {matériaux.map((materiau, i) => (
              <li
                key={i}
                className={`text-xs font-medium px-2.5 py-1 rounded-full ${COULEURS_BADGES[i % COULEURS_BADGES.length]}`}
              >
                {materiau}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-400 italic">
            Aucun matériau identifié
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
        <span
          className={`w-2 h-2 rounded-full ${reference_visible ? "bg-green-500" : "bg-slate-300"}`}
        />
        <p className="text-xs text-slate-500">
          {reference_visible
            ? "Objet de référence visible sur la photo"
            : "Aucun objet de référence visible"}
        </p>
      </div>

      {/* Bouton Valider -> Edit Devis */}
      <button
        onClick={() => onValiderEditDevis && onValiderEditDevis(resultat)}
        type="button"
        className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg py-2.5 transition-colors flex items-center justify-center gap-2"
      >
        Valider
        <span aria-hidden="true">→</span>
        Edit Devis
      </button>
    </div>
  );
}
