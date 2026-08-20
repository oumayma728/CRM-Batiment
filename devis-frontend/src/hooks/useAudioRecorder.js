import { useRef, useState, useCallback } from "react";

// Sous-tache 1 : enregistrement audio via Web Audio API, encodage WAV manuel
// (le MediaRecorder natif des navigateurs produit du webm/ogg, pas du WAV --
// on capture les echantillons PCM bruts et on construit le fichier WAV
// nous-memes, sans dependance externe).
//
// Note technique : utilise ScriptProcessorNode (API depreciee mais
// universellement supportee, simple a mettre en oeuvre sans fichier worklet
// separe). A migrer vers AudioWorkletNode si un vrai usage production
// intensif est prevu -- suffisant pour ce composant.

const DUREE_MAX_SECONDES = 60;
const TAILLE_BUFFER = 4096;

function encoderWAV(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const ecrireChaine = (offset, chaine) => {
    for (let i = 0; i < chaine.length; i++)
      view.setUint8(offset + i, chaine.charCodeAt(i));
  };

  ecrireChaine(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  ecrireChaine(8, "WAVE");
  ecrireChaine(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  ecrireChaine(36, "data");
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([view], { type: "audio/wav" });
}

export function useAudioRecorder() {
  const [enregistrement, setEnregistrement] = useState(false);
  const [duree, setDuree] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [erreur, setErreur] = useState("");
  const [donneesVisualisation, setDonneesVisualisation] = useState(
    new Uint8Array(0),
  );

  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const processorRef = useRef(null);
  const streamRef = useRef(null);
  const samplesRef = useRef([]);
  const sampleRateRef = useRef(44100);
  const intervalRef = useRef(null);
  const animationFrameRef = useRef(null);

  const arreterFluxAudio = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (animationFrameRef.current)
      cancelAnimationFrame(animationFrameRef.current);
  }, []);

  const majVisualisation = useCallback(() => {
    if (!analyserRef.current) return;
    const data = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(data);
    setDonneesVisualisation(data);
    animationFrameRef.current = requestAnimationFrame(majVisualisation);
  }, []);

  const demarrer = useCallback(async () => {
    setErreur("");
    setAudioBlob(null);
    setAudioUrl(null);
    samplesRef.current = [];
    setDuree(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContextClass();
      audioContextRef.current = audioContext;
      sampleRateRef.current = audioContext.sampleRate;

      const source = audioContext.createMediaStreamSource(stream);

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;

      // ScriptProcessorNode : capture les echantillons PCM bruts pour
      // l'encodage WAV final. API depreciee mais fonctionnelle partout,
      // suffisant pour ce composant (cf. note en haut du fichier).
      const processor = audioContext.createScriptProcessor(TAILLE_BUFFER, 1, 1);
      processorRef.current = processor;
      processor.onaudioprocess = (e) => {
        const canal = e.inputBuffer.getChannelData(0);
        samplesRef.current.push(new Float32Array(canal));
      };

      source.connect(analyser);
      source.connect(processor);
      processor.connect(audioContext.destination);

      setEnregistrement(true);
      majVisualisation();

      const debut = Date.now();
      intervalRef.current = setInterval(() => {
        const secoulees = (Date.now() - debut) / 1000;
        setDuree(secoulees);
        if (secoulees >= DUREE_MAX_SECONDES) {
          arreter();
        }
      }, 100);
    } catch (err) {
      setErreur(
        err.name === "NotAllowedError"
          ? "Accès au microphone refusé. Autorise le micro dans les paramètres du navigateur."
          : `Impossible de démarrer l'enregistrement : ${err.message}`,
      );
    }
  }, [majVisualisation]);

  const arreter = useCallback(() => {
    arreterFluxAudio();
    setEnregistrement(false);
    setDonneesVisualisation(new Uint8Array(0));

    const longueurTotale = samplesRef.current.reduce(
      (somme, chunk) => somme + chunk.length,
      0,
    );
    const samplesConcatenes = new Float32Array(longueurTotale);
    let offset = 0;
    for (const chunk of samplesRef.current) {
      samplesConcatenes.set(chunk, offset);
      offset += chunk.length;
    }

    if (longueurTotale === 0) {
      setErreur(
        "Aucun son capté. Vérifie que le micro fonctionne et réessaie.",
      );
      return;
    }

    const blob = encoderWAV(samplesConcatenes, sampleRateRef.current);
    setAudioBlob(blob);
    setAudioUrl(URL.createObjectURL(blob));
  }, [arreterFluxAudio]);

  const reinitialiser = useCallback(() => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setDuree(0);
    setErreur("");
  }, [audioUrl]);

  return {
    enregistrement,
    duree,
    audioBlob,
    audioUrl,
    erreur,
    donneesVisualisation,
    dureeMax: DUREE_MAX_SECONDES,
    demarrer,
    arreter,
    reinitialiser,
  };
}
