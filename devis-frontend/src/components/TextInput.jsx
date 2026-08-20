import { useState } from 'react';

const LONGUEUR_MIN = 10;

export default function TextInput({ onDescriptionValidee }) {
  const [texte, setTexte] = useState('');
  const [erreur, setErreur] = useState('');

  const handleContinuer = () => {
    const texteNettoye = texte.trim();
    if (texteNettoye.length < LONGUEUR_MIN) {
      setErreur(`Décris le besoin en au moins ${LONGUEUR_MIN} caractères.`);
      return;
    }
    setErreur('');
    onDescriptionValidee(texteNettoye);
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      <label className="block text-sm font-semibold text-slate-700 mb-2 tracking-wide">
        Description du besoin
      </label>

      <textarea
        value={texte}
        onChange={(e) => { setTexte(e.target.value); if (erreur) setErreur(''); }}
        rows={6}
        placeholder="Ex : Isolation des combles sur 80m², remplacement de 3 fenêtres en PVC double vitrage..."
        className={`w-full text-sm text-slate-800 border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none
          ${erreur ? 'border-red-400' : 'border-slate-300'}`}
      />

      {erreur && (
        <p className="mt-2 text-sm text-red-600" role="alert">{erreur}</p>
      )}

      <button
        onClick={handleContinuer}
        type="button"
        className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg py-2.5 transition-colors"
      >
        Continuer
      </button>
    </div>
  );
}
