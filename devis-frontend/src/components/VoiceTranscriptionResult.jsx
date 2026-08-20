import { useState, useEffect } from "react";

// Sous-tache 3 : texte retranscrit editable, badge de confiance
// (rouge < 0.7, orange 0.7-0.85, vert > 0.85 -- seuils exacts demandes),
// bouton "Valider -> Générer Devis".

function styleConfiance(score) {
  if (score > 0.85)
    return {
      label: "Aucune anomalie détectée",
      couleur: "bg-green-100 text-green-800 border-green-300",
    };
  if (score >= 0.7)
    return {
      label: "À vérifier",
      couleur: "bg-orange-100 text-orange-800 border-orange-300",
    };
  return {
    label: "Fiabilité incertaine",
    couleur: "bg-red-100 text-red-800 border-red-300",
  };
}

export default function VoiceTranscriptionResult({
  resultat,
  onValiderGenererDevis,
}) {
  const [texte, setTexte] = useState(resultat?.transcription_texte || "");
  const [aEteModifie, setAEteModifie] = useState(false);

  useEffect(() => {
    setTexte(resultat?.transcription_texte || "");
    setAEteModifie(false);
  }, [resultat]);

  if (!resultat) return null;

  const confiance = styleConfiance(resultat.confidence_score);

  const handleChange = (e) => {
    setTexte(e.target.value);
    setAEteModifie(true);
  };

  return (
    <div className="mt-4 rounded-lg border border-slate-200 bg-white p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700 tracking-wide uppercase">
          Transcription
        </h3>
        <span
          className={`text-xs font-medium px-2.5 py-1 rounded-full border ${confiance.couleur}`}
        >
          {confiance.label} ({Math.round(resultat.confidence_score * 100)}%)
        </span>
      </div>

      <div>
        <textarea
          value={texte}
          onChange={handleChange}
          rows={5}
          className="w-full text-sm text-slate-800 border border-slate-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
        {aEteModifie && (
          <p className="text-xs text-blue-600 mt-1">
            Texte corrigé par rapport à la transcription d'origine.
          </p>
        )}
      </div>

      <p className="text-xs text-slate-400">
        Ce score détecte des anomalies automatiques (répétitions, transcription
        anormalement courte) — il ne garantit pas l'exactitude du texte. Relis
        toujours avant de valider.
      </p>

      <p className="text-xs text-slate-400">
        Durée de l'enregistrement : {resultat.duration_seconds.toFixed(1)}s
      </p>

      <button
        onClick={() => onValiderGenererDevis && onValiderGenererDevis(texte)}
        type="button"
        className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg py-2.5 transition-colors flex items-center justify-center gap-2"
      >
        Valider
        <span aria-hidden="true">→</span>
        Générer Devis
      </button>
    </div>
  );
}
