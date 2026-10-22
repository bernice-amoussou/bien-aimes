"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  extensionForMimeType,
  getRecordingBlockReason,
  isRecordingSupported,
  mapRecorderError,
  pickSupportedMimeType,
  type RecorderErrorCode,
} from "./recorder";

export type RecorderStatus = "idle" | "requesting" | "recording" | "paused" | "stopped";

export interface RecordingResult {
  file: File;
  /** Durée mesurée pendant la capture, en secondes. */
  duration: number;
  mimeType: string;
}

const noopSubscribe = () => () => {};

/** En dessous de ce niveau (RMS ≈ -46 dBFS) pendant toute la capture, l'enregistrement est jugé silencieux. */
const SILENCE_THRESHOLD = 0.005;

export interface AudioInputDevice {
  deviceId: string;
  label: string;
}

/**
 * Capture audio depuis le micro.
 * Gère : permissions, absence de micro, contexte non sécurisé, codecs variables,
 * pause / reprise et minutage précis (les pauses ne sont pas comptées),
 * niveau d'entrée en direct, choix du micro et détection d'un enregistrement silencieux.
 */
export function useAudioRecorder(onComplete: (result: RecordingResult) => void) {
  // Rendu serveur : on suppose le support, la vérification réelle se fait au montage.
  const blockReason = useSyncExternalStore(noopSubscribe, getRecordingBlockReason, () => null);
  const supported = blockReason === null;

  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [error, setError] = useState<RecorderErrorCode | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [mimeType, setMimeType] = useState<string | null>(null);
  /** Niveau d'entrée instantané (RMS, 0 → 1). */
  const [level, setLevel] = useState(0);
  /** Vrai si le dernier enregistrement n'a capté aucun son. */
  const [silent, setSilent] = useState(false);
  /** Du son a-t-il été capté depuis le début de l'enregistrement en cours ? */
  const [heardSound, setHeardSound] = useState(false);
  const [canMeasure, setCanMeasure] = useState(false);
  const [devices, setDevices] = useState<AudioInputDevice[]>([]);
  const [deviceId, setDeviceId] = useState("");

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const accumulatedRef = useRef(0);
  const segmentStartRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const peakLevelRef = useRef(0);
  /** L'analyse du niveau a-t-elle pu être mise en place ? Sinon, on ne conclut pas au silence. */
  const analysedRef = useRef(false);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const currentElapsed = useCallback(() => {
    const running =
      segmentStartRef.current !== null ? performance.now() - segmentStartRef.current : 0;
    return accumulatedRef.current + running;
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    segmentStartRef.current = performance.now();
    timerRef.current = window.setInterval(() => {
      setElapsedMs(currentElapsed());
      const analyser = analyserRef.current;
      // Tant que Chrome n'a pas démarré l'analyse, on ne mesure rien (et on ne conclut pas au silence).
      if (!analyser || analyser.context.state !== "running") return;
      if (!analysedRef.current) {
        analysedRef.current = true;
        setCanMeasure(true);
      }
      const samples = new Float32Array(analyser.fftSize);
      analyser.getFloatTimeDomainData(samples);
      let sum = 0;
      for (const v of samples) sum += v * v;
      const rms = Math.sqrt(sum / samples.length);
      peakLevelRef.current = Math.max(peakLevelRef.current, rms);
      if (rms >= SILENCE_THRESHOLD) setHeardSound(true);
      setLevel(rms);
    }, 100);
  }, [currentElapsed, stopTimer]);

  const freezeTimer = useCallback(() => {
    accumulatedRef.current = currentElapsed();
    segmentStartRef.current = null;
    stopTimer();
    setElapsedMs(accumulatedRef.current);
    setLevel(0);
  }, [currentElapsed, stopTimer]);

  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    analyserRef.current = null;
    void audioContextRef.current?.close().catch(() => {});
    audioContextRef.current = null;
  }, []);

  // Liste des micros. Les noms ne sont fournis qu'après une première autorisation.
  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      const inputs = all.filter((d) => d.kind === "audioinput" && d.deviceId);
      setDevices(inputs.map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Micro ${i + 1}` })));
    } catch {
      setDevices([]);
    }
  }, []);

  // Liste chargée au premier enregistrement (noms disponibles), puis à chaque branchement.
  useEffect(() => {
    if (!navigator.mediaDevices?.addEventListener) return;
    navigator.mediaDevices.addEventListener("devicechange", refreshDevices);
    return () => navigator.mediaDevices.removeEventListener("devicechange", refreshDevices);
  }, [refreshDevices]);

  const start = useCallback(async () => {
    if (!isRecordingSupported()) {
      setError(window.isSecureContext ? "unsupported" : "insecure");
      return;
    }
    setError(null);
    setSilent(false);
    setHeardSound(false);
    setCanMeasure(false);
    analysedRef.current = false;
    setStatus("requesting");

    // L'AudioContext de la jauge est créé ici, pendant le clic : créé après la demande
    // d'autorisation (qui peut durer), Chrome le démarrerait en pause.
    let meterContext: AudioContext | null = null;
    try {
      meterContext = new AudioContext();
    } catch {
      meterContext = null;
    }

    const audioConstraints = { echoCancellation: true, noiseSuppression: true };
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: deviceId ? { ...audioConstraints, deviceId: { exact: deviceId } } : audioConstraints,
      });
    } catch (err) {
      // Micro choisi débranché ou indisponible : on retente avec le micro par défaut.
      const retry =
        deviceId && err instanceof DOMException && ["OverconstrainedError", "NotFoundError", "NotReadableError"].includes(err.name);
      try {
        if (!retry) throw err;
        stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
        setDeviceId("");
      } catch (finalError) {
        void meterContext?.close().catch(() => {});
        setError(mapRecorderError(finalError));
        setStatus("idle");
        return;
      }
    }

    let recorder: MediaRecorder;
    try {
      const preferred = pickSupportedMimeType();
      recorder = preferred
        ? new MediaRecorder(stream, { mimeType: preferred })
        : new MediaRecorder(stream);
    } catch {
      stream.getTracks().forEach((track) => track.stop());
      void meterContext?.close().catch(() => {});
      setError("unsupported");
      setStatus("idle");
      return;
    }

    streamRef.current = stream;
    recorderRef.current = recorder;
    chunksRef.current = [];
    accumulatedRef.current = 0;
    peakLevelRef.current = 0;
    setElapsedMs(0);
    void refreshDevices();

    // Analyse du niveau d'entrée : facultative, sans effet sur l'enregistrement lui-même.
    if (meterContext) {
      try {
        const analyser = meterContext.createAnalyser();
        analyser.fftSize = 1024;
        meterContext.createMediaStreamSource(stream).connect(analyser);
        audioContextRef.current = meterContext;
        analyserRef.current = analyser;
        // Si Chrome l'a laissé en pause, on tente de le relancer sans attendre.
        if (meterContext.state !== "running") void meterContext.resume().catch(() => {});
      } catch {
        analyserRef.current = null;
        void meterContext.close().catch(() => {});
      }
    }

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onerror = () => {
      freezeTimer();
      releaseStream();
      setError("generic");
      setStatus("idle");
    };
    recorder.onstop = () => {
      releaseStream();
      // Le type réel peut différer du type demandé (ou être vide sur certains navigateurs).
      const type = recorder.mimeType || chunksRef.current[0]?.type || "audio/webm";
      const blob = new Blob(chunksRef.current, { type });
      chunksRef.current = [];
      if (blob.size === 0) {
        setError("empty");
        setStatus("idle");
        return;
      }
      const extension = extensionForMimeType(type);
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      const file = new File([blob], `enregistrement-${stamp}.${extension}`, { type });
      setSilent(analysedRef.current && peakLevelRef.current < SILENCE_THRESHOLD);
      setStatus("stopped");
      onCompleteRef.current({ file, duration: accumulatedRef.current / 1000, mimeType: type });
    };

    // Un intervalle de 1 s limite la perte de données si l'onglet se ferme brutalement.
    recorder.start(1000);
    setMimeType(recorder.mimeType || null);
    setStatus("recording");
    startTimer();
  }, [deviceId, freezeTimer, refreshDevices, releaseStream, startTimer]);

  const pause = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder?.state !== "recording") return;
    recorder.pause();
    freezeTimer();
    setStatus("paused");
  }, [freezeTimer]);

  const resume = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder?.state !== "paused") return;
    recorder.resume();
    startTimer();
    setStatus("recording");
  }, [startTimer]);

  const stop = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    freezeTimer();
    recorder.stop();
  }, [freezeTimer]);

  const reset = useCallback(() => {
    accumulatedRef.current = 0;
    setElapsedMs(0);
    setError(null);
    setStatus("idle");
  }, []);

  // Nettoyage : on coupe le micro si le composant est démonté en cours de capture.
  useEffect(() => {
    return () => {
      stopTimer();
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.onstop = null;
        recorder.stop();
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      void audioContextRef.current?.close().catch(() => {});
    };
  }, [stopTimer]);

  return {
    supported,
    blockReason,
    status,
    error,
    elapsedSeconds: elapsedMs / 1000,
    mimeType,
    level,
    silent,
    heardSound,
    /** Faux si le niveau d'entrée n'a pas pu être analysé (navigateur sans Web Audio). */
    canMeasure,
    devices,
    deviceId,
    setDeviceId,
    start,
    pause,
    resume,
    stop,
    reset,
  };
}
