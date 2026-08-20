import { useState } from "react";
import TextInput from "./components/TextInput";
import PhotoUpload from "./components/PhotoUpload";
import PhotoAnalysisResult from "./components/PhotoAnalysisResult";
import VoiceRecorder from "./components/VoiceRecorder";
import AudioUpload from "./components/AudioUpload";
import VoiceTranscriptionResult from "./components/VoiceTranscriptionResult";
import EditDevis from "./components/EditDevis";

const API_URL = "http://127.0.0.1:8000";

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const ONGLETS = [
  { id: "texte", label: "Texte" },
  { id: "photo", label: "Photo" },
  { id: "vocal", label: "Vocal" },
];

function App() {
  const [onglet, setOnglet] = useState("texte");
  const [ecran, setEcran] = useState("saisie"); // 'saisie' | 'edit-devis'

  // Texte
  const [descriptionTexte, setDescriptionTexte] = useState(null);

  // Photo
  const [analysePhoto, setAnalysePhoto] = useState(null);
  const [chargementPhoto, setChargementPhoto] = useState(false);
  const [erreurPhoto, setErreurPhoto] = useState("");

  // Vocal
  const [modeVocal, setModeVocal] = useState("enregistrer"); // 'enregistrer' | 'importer'
  const [transcriptionVocal, setTranscriptionVocal] = useState(null);
  const [chargementVocal, setChargementVocal] = useState(false);
  const [erreurVocal, setErreurVocal] = useState("");
  const [descriptionVocalValidee, setDescriptionVocalValidee] = useState(null);

  const reinitialiserTout = () => {
    setDescriptionTexte(null);
    setAnalysePhoto(null);
    setErreurPhoto("");
    setTranscriptionVocal(null);
    setErreurVocal("");
    setDescriptionVocalValidee(null);
  };

  const handleChangerOnglet = (id) => {
    setOnglet(id);
    setEcran("saisie");
    reinitialiserTout();
  };

  // --- TEXTE ---
  const handleTextValidated = (texte) => {
    setDescriptionTexte(texte);
    setEcran("edit-devis");
  };

  // --- PHOTO ---
  const handleFileValidated = async (file) => {
    setAnalysePhoto(null);
    setErreurPhoto("");
    setChargementPhoto(true);
    try {
      const imageBase64 = await fileToBase64(file);
      const response = await fetch(`${API_URL}/api/devis/photo-analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_base64: imageBase64 }),
      });
      if (!response.ok) {
        const detail = await response.json().catch(() => ({}));
        throw new Error(detail.detail || `Erreur ${response.status}`);
      }
      setAnalysePhoto(await response.json());
    } catch (err) {
      setErreurPhoto(
        err.message === "Failed to fetch"
          ? "Impossible de contacter l'API. Vérifie qu'elle tourne bien sur le port 8000."
          : `Échec de l'analyse : ${err.message}`,
      );
    } finally {
      setChargementPhoto(false);
    }
  };

  // --- VOCAL (commun a l'enregistrement live et a l'import de fichier) ---
  const transcrireAudio = async (audioBlob, dureeSecondes) => {
    setTranscriptionVocal(null);
    setErreurVocal("");
    setChargementVocal(true);

    try {
      const formData = new FormData();
      formData.append("file", audioBlob, "audio.wav");

      const response = await fetch(
        `${API_URL}/api/devis/vocal-transcribe?duration_seconds=${dureeSecondes}`,
        { method: "POST", body: formData },
      );
      if (!response.ok) {
        const detail = await response.json().catch(() => ({}));
        throw new Error(detail.detail || `Erreur ${response.status}`);
      }
      setTranscriptionVocal(await response.json());
    } catch (err) {
      setErreurVocal(
        err.message === "Failed to fetch"
          ? "Impossible de contacter l'API. Vérifie qu'elle tourne bien sur le port 8000."
          : `Échec de la transcription : ${err.message}`,
      );
    } finally {
      setChargementVocal(false);
    }
  };

  const handleValiderVocal = (texteValide) => {
    setDescriptionVocalValidee(texteValide);
    setEcran("edit-devis");
  };

  const descriptionInitiale =
    onglet === "texte"
      ? descriptionTexte
      : onglet === "vocal"
        ? descriptionVocalValidee
        : null;
  const analyseInitiale = onglet === "photo" ? analysePhoto : null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-8">
      {ecran === "saisie" && (
        <div className="w-full max-w-xl mb-2">
          <div className="flex gap-1 mb-6 bg-slate-100 rounded-lg p-1">
            {ONGLETS.map((o) => (
              <button
                key={o.id}
                onClick={() => handleChangerOnglet(o.id)}
                type="button"
                className={`flex-1 text-sm font-medium py-2 rounded-md transition-colors
                  ${onglet === o.id ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {ecran === "saisie" ? (
        <div className="w-full max-w-xl">
          {onglet === "texte" && (
            <TextInput onDescriptionValidee={handleTextValidated} />
          )}

          {onglet === "photo" && (
            <>
              <PhotoUpload onFileValidated={handleFileValidated} />
              {chargementPhoto && (
                <p className="mt-4 text-sm text-slate-500 text-center animate-pulse">
                  Analyse de la photo en cours...
                </p>
              )}
              {erreurPhoto && (
                <p
                  className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2"
                  role="alert"
                >
                  {erreurPhoto}
                </p>
              )}
              {analysePhoto && !chargementPhoto && (
                <PhotoAnalysisResult
                  resultat={analysePhoto}
                  onValiderEditDevis={() => setEcran("edit-devis")}
                  onBasculerVersTexte={() => handleChangerOnglet("texte")}
                />
              )}
            </>
          )}

          {onglet === "vocal" && (
            <>
              <div className="flex gap-1 mb-4 bg-slate-100 rounded-lg p-1 max-w-xs mx-auto">
                <button
                  onClick={() => {
                    setModeVocal("enregistrer");
                    setTranscriptionVocal(null);
                    setErreurVocal("");
                  }}
                  type="button"
                  className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors ${modeVocal === "enregistrer" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                  Enregistrer
                </button>
                <button
                  onClick={() => {
                    setModeVocal("importer");
                    setTranscriptionVocal(null);
                    setErreurVocal("");
                  }}
                  type="button"
                  className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors ${modeVocal === "importer" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                  Importer un fichier
                </button>
              </div>

              {modeVocal === "enregistrer" ? (
                <VoiceRecorder onAudioPret={transcrireAudio} />
              ) : (
                <AudioUpload onFileValidated={transcrireAudio} />
              )}

              {chargementVocal && (
                <p className="mt-4 text-sm text-slate-500 text-center animate-pulse">
                  Transcription en cours...
                </p>
              )}
              {erreurVocal && (
                <p
                  className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2"
                  role="alert"
                >
                  {erreurVocal}
                </p>
              )}
              {transcriptionVocal && !chargementVocal && (
                <VoiceTranscriptionResult
                  resultat={transcriptionVocal}
                  onValiderGenererDevis={handleValiderVocal}
                />
              )}
            </>
          )}
        </div>
      ) : (
        <EditDevis
          analyseInitiale={analyseInitiale}
          descriptionInitiale={descriptionInitiale}
          onRetour={() => setEcran("saisie")}
        />
      )}
    </div>
  );
}

export default App;
