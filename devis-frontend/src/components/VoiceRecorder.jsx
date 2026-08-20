import { useRef, useEffect } from "react";
import { useAudioRecorder } from "../hooks/useaudiorecorder";

function formaterDuree(secondes) {
  const s = Math.floor(secondes);
  const min = Math.floor(s / 60);
  const sec = s % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

export default function VoiceRecorder({ onAudioPret }) {
  const {
    enregistrement,
    duree,
    audioBlob,
    audioUrl,
    erreur,
    donneesVisualisation,
    dureeMax,
    demarrer,
    arreter,
    reinitialiser,
  } = useAudioRecorder();

  const canvasRef = useRef(null);

  // Dessine le niveau micro en temps reel (barres simples) pendant l'enregistrement.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const largeur = canvas.width;
    const hauteur = canvas.height;

    ctx.clearRect(0, 0, largeur, hauteur);

    if (donneesVisualisation.length === 0) return;

    const nbBarres = donneesVisualisation.length;
    const largeurBarre = largeur / nbBarres;

    ctx.fillStyle = enregistrement ? "#2563eb" : "#cbd5e1";
    for (let i = 0; i < nbBarres; i++) {
      const valeur = donneesVisualisation[i] / 255;
      const hauteurBarre = Math.max(2, valeur * hauteur);
      ctx.fillRect(
        i * largeurBarre,
        hauteur - hauteurBarre,
        largeurBarre - 2,
        hauteurBarre,
      );
    }
  }, [donneesVisualisation, enregistrement]);

  useEffect(() => {
    if (audioBlob && onAudioPret) {
      onAudioPret(audioBlob, duree);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioBlob]);

  const progression = Math.min(duree / dureeMax, 1);

  return (
    <div className="w-full max-w-xl mx-auto">
      <label className="block text-sm font-semibold text-slate-700 mb-2 tracking-wide">
        Enregistrement vocal
      </label>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
        <canvas
          ref={canvasRef}
          width={500}
          height={60}
          className="w-full h-14 mb-4"
        />

        <div className="flex items-center justify-between mb-4">
          <span className="text-2xl font-mono text-slate-800 tabular-nums">
            {formaterDuree(duree)}
          </span>
          <span className="text-xs text-slate-400">
            max {formaterDuree(dureeMax)}
          </span>
        </div>

        <div className="w-full h-1.5 bg-slate-200 rounded-full mb-5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${progression > 0.85 ? "bg-red-500" : "bg-blue-500"}`}
            style={{ width: `${progression * 100}%` }}
          />
        </div>

        <div className="flex gap-2">
          {!enregistrement && !audioUrl && (
            <button
              onClick={demarrer}
              type="button"
              className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg py-2.5 flex items-center justify-center gap-2 transition-colors"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-white" />
              Enregistrer
            </button>
          )}

          {enregistrement && (
            <button
              onClick={arreter}
              type="button"
              className="flex-1 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-lg py-2.5 flex items-center justify-center gap-2 transition-colors"
            >
              <span className="w-2.5 h-2.5 bg-white" />
              Arrêter
            </button>
          )}

          {!enregistrement && audioUrl && (
            <>
              <audio src={audioUrl} controls className="flex-1 h-10" />
              <button
                onClick={reinitialiser}
                type="button"
                className="px-4 border border-slate-300 hover:bg-slate-100 text-slate-600 text-sm font-medium rounded-lg transition-colors"
              >
                Recommencer
              </button>
            </>
          )}
        </div>
      </div>

      {erreur && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {erreur}
        </p>
      )}
    </div>
  );
}
