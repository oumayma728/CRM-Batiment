import { useState } from "react";

const API_URL = "http://127.0.0.1:8000";

function construireDescriptionParDefaut(analyse) {
  if (!analyse) return "";
  const surfaceTexte =
    analyse.surface_m2 !== null && analyse.surface_m2 !== undefined
      ? `${analyse.surface_m2} m²`
      : "non déterminée";
  const materiauxTexte =
    analyse.matériaux && analyse.matériaux.length > 0
      ? analyse.matériaux.join(", ")
      : "aucun matériau identifié";
  // objet_compte / nombre_unites_estimee : uniquement pour les elements
  // factures a l'unite plutot qu'au m2 (fenetres, portes, ...) -- absent de
  // la phrase si l'analyse ne les a pas renvoyes (cf. api.py / photo_analyze.py).
  const quantiteTexte =
    analyse.objet_compte &&
    analyse.nombre_unites_estimee !== null &&
    analyse.nombre_unites_estimee !== undefined
      ? ` Quantité estimée : ${analyse.nombre_unites_estimee} ${analyse.objet_compte}.`
      : "";
  return `Photo de chantier analysée : ${analyse.type_pièce}. Surface estimée : ${surfaceTexte}. Matériaux identifiés : ${materiauxTexte}.${quantiteTexte}`;
}

export default function EditDevis({
  analyseInitiale,
  descriptionInitiale,
  onRetour,
}) {
  const [description, setDescription] = useState(
    descriptionInitiale || construireDescriptionParDefaut(analyseInitiale),
  );
  const [clientNom, setClientNom] = useState("");
  const [clientAdresse, setClientAdresse] = useState("");

  const [lignes, setLignes] = useState(null); // lignes editables, une fois previsualisees
  const [chargementPreview, setChargementPreview] = useState(false);

  const [devisGenere, setDevisGenere] = useState(null);
  const [chargementGeneration, setChargementGeneration] = useState(false);

  const [erreur, setErreur] = useState("");

  const handlePrevisualiser = async () => {
    setErreur("");
    setChargementPreview(true);
    setLignes(null);

    try {
      const response = await fetch(`${API_URL}/api/devis/match-catalogue`, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          description_libre: description,
          modalite_source: descriptionInitiale ? "texte" : "photo",
        }),
      });
      if (!response.ok) {
        const detail = await response.json().catch(() => ({}));
        throw new Error(detail.detail || `Erreur ${response.status}`);
      }
      const resultat = await response.json();
      // Ne garde que les lignes exploitables (trouvees dans le catalogue,
      // avec un vrai prix) -- filet de securite deja en place cote affichage.
      const lignesExploitables = resultat.lignes.filter(
        (l) => !l.non_trouve_dans_catalogue && l.sous_total > 0,
      );
      setLignes(lignesExploitables);
    } catch (err) {
      setErreur(
        err.message === "Failed to fetch"
          ? "Impossible de contacter l'API."
          : err.message,
      );
    } finally {
      setChargementPreview(false);
    }
  };

  const handleModifierLigne = (index, champ, valeur) => {
    setLignes((prev) => {
      const copie = [...prev];
      const ligne = { ...copie[index], [champ]: valeur };
      // Recalcul immediat du sous-total a chaque modification de qte/prix --
      // jamais laisser un sous_total perime affiche a l'ecran.
      ligne.sous_total =
        Math.round(
          (ligne.quantite_estimee || 0) * (ligne.prix_unitaire || 0) * 100,
        ) / 100;
      copie[index] = ligne;
      return copie;
    });
  };

  const handleSupprimerLigne = (index) => {
    setLignes((prev) => prev.filter((_, i) => i !== index));
  };

  const totalHtEdite = lignes
    ? lignes.reduce((somme, l) => somme + (l.sous_total || 0), 0)
    : 0;

  const handleGenerer = async () => {
    if (!clientNom.trim() || !clientAdresse.trim()) {
      setErreur(
        "Renseigne le nom et l'adresse du client avant de générer le devis.",
      );
      return;
    }
    if (!lignes || lignes.length === 0) {
      setErreur(
        "Prévisualise et garde au moins une ligne avant de générer le devis.",
      );
      return;
    }

    setErreur("");
    setChargementGeneration(true);

    try {
      // Generation depuis les lignes EDITEES directement -- pas de nouvel
      // appel au modele, les corrections manuelles sont bien prises en compte.
      const response = await fetch(
        `${API_URL}/api/devis/generer-depuis-lignes`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json; charset=utf-8" },
          body: JSON.stringify({
            lignes: lignes.map((l) => ({
              sku_catalogue: l.sku_catalogue,
              label_prestation: l.label_prestation,
              quantite_estimee: l.quantite_estimee,
              unite: l.unite,
              prix_unitaire: l.prix_unitaire,
            })),
            objet: description,
            entreprise_nom: "3LM Solutions",
            entreprise_adresse: "1 Rue Test, 75000 Paris",
            entreprise_tel: "+33 1 00 00 00 00",
            entreprise_email: "contact@3lm.fr",
            client_nom: clientNom,
            client_adresse: clientAdresse,
            tva_pct: 10.0,
          }),
        },
      );
      if (!response.ok) {
        const detail = await response.json().catch(() => ({}));
        throw new Error(detail.detail || `Erreur ${response.status}`);
      }
      const resultat = await response.json();
      setDevisGenere(resultat);
    } catch (err) {
      setErreur(
        err.message === "Failed to fetch"
          ? "Impossible de contacter l'API."
          : err.message,
      );
    } finally {
      setChargementGeneration(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">
          Édition du devis
        </h2>
        <button
          onClick={onRetour}
          type="button"
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          ← Retour
        </button>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-4">
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">
            Description du besoin
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full text-sm text-slate-800 border border-slate-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">
              Nom du client
            </label>
            <input
              type="text"
              value={clientNom}
              onChange={(e) => setClientNom(e.target.value)}
              placeholder="M. Jean Dupont"
              className="w-full text-sm text-slate-800 border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">
              Adresse du client
            </label>
            <input
              type="text"
              value={clientAdresse}
              onChange={(e) => setClientAdresse(e.target.value)}
              placeholder="18 Rue Victor Hugo, 59100 Roubaix"
              className="w-full text-sm text-slate-800 border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <button
          onClick={handlePrevisualiser}
          disabled={chargementPreview}
          type="button"
          className="w-full border border-slate-300 hover:bg-slate-50 disabled:opacity-50 text-slate-700 text-sm font-medium rounded-lg py-2.5 transition-colors"
        >
          {chargementPreview
            ? "Recherche des correspondances..."
            : "Prévisualiser les lignes catalogue"}
        </button>
      </div>

      {erreur && (
        <p
          className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2"
          role="alert"
        >
          {erreur}
        </p>
      )}

      {lignes && (
        <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">
              Lignes du devis
            </h3>
            <span className="text-xs text-slate-400">
              Quantité et prix modifiables
            </span>
          </div>

          {lignes.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400 border-b border-slate-200">
                  <th className="pb-2 font-medium">Prestation</th>
                  <th className="pb-2 font-medium text-right w-20">Qté</th>
                  <th className="pb-2 font-medium text-right w-24">
                    PU HT (€)
                  </th>
                  <th className="pb-2 font-medium text-right w-24">Total HT</th>
                  <th className="pb-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {lignes.map((l, i) => (
                  <tr
                    key={i}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="py-2 text-slate-800">
                      {l.label_prestation}
                    </td>
                    <td className="py-2 text-right">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={l.quantite_estimee}
                        onChange={(e) =>
                          handleModifierLigne(
                            i,
                            "quantite_estimee",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        className="w-16 text-right text-sm border border-slate-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-2 text-right">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={l.prix_unitaire}
                        onChange={(e) =>
                          handleModifierLigne(
                            i,
                            "prix_unitaire",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        className="w-20 text-right text-sm border border-slate-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-2 text-right text-slate-800 font-medium">
                      {l.sous_total.toFixed(2)} €
                    </td>
                    <td className="py-2 text-right">
                      <button
                        onClick={() => handleSupprimerLigne(i)}
                        type="button"
                        className="text-slate-300 hover:text-red-500 text-sm"
                        aria-label="Supprimer la ligne"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-slate-400 italic">
              Aucune ligne exploitable — la description manque probablement de
              précision.
            </p>
          )}

          <p className="text-sm font-semibold text-slate-800 text-right pt-2 border-t border-slate-100">
            Total HT : {totalHtEdite.toFixed(2)} €
          </p>
        </div>
      )}

      {!devisGenere ? (
        <button
          onClick={handleGenerer}
          disabled={chargementGeneration}
          type="button"
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-sm font-medium rounded-lg py-2.5 transition-colors"
        >
          {chargementGeneration ? "Génération en cours..." : "Générer le devis"}
        </button>
      ) : (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-2">
          <p className="text-sm font-semibold text-green-800">
            Devis {devisGenere.numero_devis} généré
          </p>
          <p className="text-sm text-green-700">
            Total TTC : {devisGenere.total_ttc.toFixed(2)} €
          </p>
          <a
            href={`${API_URL}${devisGenere.document_url}`}
            className="inline-block text-sm text-blue-700 hover:text-blue-800 font-medium underline"
          >
            Télécharger le document Word
          </a>
        </div>
      )}
    </div>
  );
}
