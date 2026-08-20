import { useState, useCallback, useRef } from "react";

const MAX_SIZE_BYTES = 15 * 1024 * 1024; // 15 Mo
const MAX_DUREE_SECONDES = 60; // coherence avec l'enregistrement live
const ACCEPTED_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "audio/webm",
];

function formaterTaille(bytes) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function formaterDuree(secondes) {
  const s = Math.floor(secondes);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

export default function AudioUpload({ onFileValidated }) {
  const [fichier, setFichier] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [duree, setDuree] = useState(null);
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);

  const lireDuree = (file, url) => {
    const audio = new Audio();
    audio.src = url;
    audio.addEventListener("loadedmetadata", () => {
      const dureeSecondes = audio.duration;

      if (!isFinite(dureeSecondes) || dureeSecondes <= 0) {
        setError("Impossible de lire la durée de ce fichier audio.");
        setFichier(null);
        setAudioUrl(null);
        return;
      }

      if (dureeSecondes > MAX_DUREE_SECONDES) {
        setError(
          `Enregistrement trop long (${formaterDuree(dureeSecondes)}). Durée maximum : ${formaterDuree(MAX_DUREE_SECONDES)}.`,
        );
        setFichier(null);
        setAudioUrl(null);
        return;
      }

      setDuree(dureeSecondes);
      if (onFileValidated) onFileValidated(file, dureeSecondes);
    });
  };

  const validerFichier = useCallback(
    (file) => {
      if (!file) return;

      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError("Format non supporté. Utilise un fichier MP3, WAV ou OGG.");
        setFichier(null);
        setAudioUrl(null);
        return;
      }

      if (file.size > MAX_SIZE_BYTES) {
        setError(
          `Fichier trop volumineux (${formaterTaille(file.size)}). Taille maximum : ${formaterTaille(MAX_SIZE_BYTES)}.`,
        );
        setFichier(null);
        setAudioUrl(null);
        return;
      }

      setError("");
      setFichier(file);
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      lireDuree(file, url);
    },
    [onFileValidated],
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragging(false);
      validerFichier(e.dataTransfer.files?.[0]);
    },
    [validerFichier],
  );

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);
  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);
  const handleInputChange = (e) => validerFichier(e.target.files?.[0]);

  const handleReset = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setFichier(null);
    setAudioUrl(null);
    setDuree(null);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="w-full">
      {!fichier ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
          }}
          className={`relative flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-500
            ${isDragging ? "border-blue-600 bg-blue-50" : error ? "border-red-400 bg-red-50" : "border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-slate-100"}`}
        >
          <svg
            className="w-8 h-8 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z"
            />
          </svg>
          <p className="text-sm text-slate-600 text-center">
            <span className="font-semibold text-blue-700">
              Clique pour choisir
            </span>{" "}
            ou glisse un fichier audio ici
          </p>
          <p className="text-xs text-slate-400">
            MP3, WAV ou OGG — 60s et 15 Mo maximum
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="audio/*"
            onChange={handleInputChange}
            className="hidden"
          />
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
          <audio src={audioUrl} controls className="w-full h-10" />
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-700 truncate max-w-[60%]">
              {fichier.name}
            </span>
            <span className="text-slate-400">
              {formaterTaille(fichier.size)}{" "}
              {duree !== null && `· ${formaterDuree(duree)}`}
            </span>
          </div>
          <button
            onClick={handleReset}
            type="button"
            className="text-xs text-slate-500 hover:text-red-600 transition-colors"
          >
            Retirer et choisir un autre fichier
          </button>
        </div>
      )}

      {error && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
