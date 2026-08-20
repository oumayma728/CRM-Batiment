import React, { useState, useCallback, useRef } from "react";

// Sous-tache 1 (Tache "Composant React PhotoUpload") : zone drag-drop,
// validation cote client (format JPEG/PNG, taille max 10 Mo), previsualisation.
// L'appel a /api/devis/extraire-photo (affichage estimation + confiance)
// est prevu pour la sous-tache suivante -- ce composant ne fait QUE
// l'upload + validation + preview, conformement au perimetre demande.

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 Mo
const ACCEPTED_TYPES = ["image/jpeg", "image/png"];

export default function PhotoUpload({ onFileValidated }) {
  const [preview, setPreview] = useState(null);
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);

  const validerFichier = useCallback(
    (file) => {
      if (!file) return;

      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError("Format non supporté. Utilise une image JPEG ou PNG.");
        setPreview(null);
        return;
      }

      if (file.size > MAX_SIZE_BYTES) {
        const tailleMo = (file.size / (1024 * 1024)).toFixed(1);
        setError(
          `Fichier trop volumineux (${tailleMo} Mo). Taille maximum : 10 Mo.`,
        );
        setPreview(null);
        return;
      }

      setError("");
      setFileName(file.name);
      setFileSize(file.size);

      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(file);

      if (onFileValidated) onFileValidated(file);
    },
    [onFileValidated],
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      validerFichier(file);
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

  const handleInputChange = (e) => {
    const file = e.target.files?.[0];
    validerFichier(file);
  };

  const handleReset = () => {
    setPreview(null);
    setFileName("");
    setFileSize(0);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const formaterTaille = (bytes) => {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      <label className="block text-sm font-semibold text-slate-700 mb-2 tracking-wide">
        Photo du chantier
      </label>

      {!preview ? (
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
          className={`relative flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-14 cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-500
            ${
              isDragging
                ? "border-blue-600 bg-blue-50"
                : error
                  ? "border-red-400 bg-red-50"
                  : "border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-slate-100"
            }`}
        >
          <svg
            className="w-10 h-10 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 7.5m0 0L7.5 12m4.5-4.5V15"
            />
          </svg>
          <p className="text-sm text-slate-600 text-center">
            <span className="font-semibold text-blue-700">
              Clique pour choisir
            </span>{" "}
            ou glisse une photo ici
          </p>
          <p className="text-xs text-slate-400">JPEG ou PNG, 10 Mo maximum</p>

          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png"
            onChange={handleInputChange}
            className="hidden"
          />
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <div className="relative bg-slate-100">
            <img
              src={preview}
              alt="Aperçu de la photo de chantier"
              className="w-full max-h-80 object-contain"
            />
            <button
              onClick={handleReset}
              type="button"
              className="absolute top-2 right-2 bg-white/90 hover:bg-white text-slate-700 rounded-full w-8 h-8 flex items-center justify-center shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 outline-none"
              aria-label="Retirer la photo"
            >
              ✕
            </button>
          </div>
          <div className="px-4 py-3 flex items-center justify-between text-sm">
            <span className="text-slate-700 truncate max-w-[70%]">
              {fileName}
            </span>
            <span className="text-slate-400">{formaterTaille(fileSize)}</span>
          </div>
        </div>
      )}

      {error && (
        <p
          className="mt-2 text-sm text-red-600 flex items-center gap-1.5"
          role="alert"
        >
          <svg
            className="w-4 h-4 shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}
