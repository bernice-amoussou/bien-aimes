"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Sermon } from "@/types/sermon";

/** Une piste jouable : un fichier audio d'une prédication. */
export interface Track {
  /** Identifiant du fichier audio. */
  id: string;
  src: string;
  sermonId: string;
  /** Thème de la prédication. */
  title: string;
  /** Nom de la partie, lorsque la prédication en compte plusieurs. */
  part: string | null;
  knownDuration: number | null;
}

interface PlayerState {
  track: Track | null;
  playing: boolean;
  buffering: boolean;
  current: number;
  duration: number;
  failed: boolean;
}

interface PlayerApi {
  /** Lance une piste (ou la reprend si c'est déjà la piste courante). */
  play: (track: Track) => void;
  /** Lecture / pause de la piste donnée, ou de la piste courante. */
  toggle: (track?: Track) => void;
  seek: (seconds: number) => void;
  skip: (delta: number) => void;
  close: () => void;
}

const StateContext = createContext<PlayerState | null>(null);
const ApiContext = createContext<PlayerApi | null>(null);

/** Pistes jouables d'une prédication (fichiers hébergés uniquement). */
export function tracksOf(sermon: Sermon): Track[] {
  const playable = sermon.audioFiles.filter((file) => file.url);
  return playable.map((file) => ({
    id: file.id,
    src: file.url as string,
    sermonId: sermon.id,
    title: sermon.title,
    part: sermon.audioFiles.length > 1 ? file.name : null,
    knownDuration: file.duration,
  }));
}

/**
 * Lecteur unique du site public : un seul élément <audio>, partagé par tous
 * les boutons de lecture. Il vit dans le layout et continue donc de jouer
 * pendant la navigation d'une page à l'autre.
 */
export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const trackRef = useRef<Track | null>(null);
  const [track, setTrack] = useState<Track | null>(null);
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [current, setCurrent] = useState(0);
  const [mediaDuration, setMediaDuration] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);

  const play = useCallback((next: Track) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (trackRef.current?.id !== next.id) {
      trackRef.current = next;
      // Changement de source dans le geste de l'utilisateur (exigé par iOS).
      audio.src = next.src;
      setTrack(next);
      setCurrent(0);
      setMediaDuration(null);
      setFailed(false);
    }
    audio.play().catch((error: unknown) => {
      if (error instanceof DOMException && error.name === "NotSupportedError") setFailed(true);
    });
  }, []);

  const toggle = useCallback(
    (target?: Track) => {
      const audio = audioRef.current;
      if (!audio) return;
      if (target && trackRef.current?.id !== target.id) {
        play(target);
        return;
      }
      if (!trackRef.current) return;
      if (audio.paused) play(trackRef.current);
      else audio.pause();
    },
    [play],
  );

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio || !trackRef.current) return;
    const upper = Number.isFinite(audio.duration)
      ? audio.duration
      : (trackRef.current.knownDuration ?? seconds);
    audio.currentTime = Math.max(0, Math.min(seconds, upper));
    setCurrent(audio.currentTime);
  }, []);

  const skip = useCallback(
    (delta: number) => {
      const audio = audioRef.current;
      if (audio) seek(audio.currentTime + delta);
    },
    [seek],
  );

  const close = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    trackRef.current = null;
    setTrack(null);
    setPlaying(false);
    setBuffering(false);
    setCurrent(0);
  }, []);

  // Commandes de l'écran verrouillé et des écouteurs (téléphones, casques Bluetooth).
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const session = navigator.mediaSession;
    session.metadata = track
      ? new MediaMetadata({ title: track.title, artist: track.part ?? "Bien-aimés", album: "Bien-aimés" })
      : null;
    const handlers: [MediaSessionAction, MediaSessionActionHandler | null][] = [
      ["play", () => trackRef.current && play(trackRef.current)],
      ["pause", () => audioRef.current?.pause()],
      ["seekbackward", () => skip(-15)],
      ["seekforward", () => skip(30)],
    ];
    for (const [action, handler] of handlers) {
      try {
        session.setActionHandler(action, track ? handler : null);
      } catch {
        // Action non prise en charge par ce navigateur.
      }
    }
  }, [track, play, skip]);

  const duration = mediaDuration ?? track?.knownDuration ?? 0;

  const state = useMemo<PlayerState>(
    () => ({ track, playing, buffering, current, duration, failed }),
    [track, playing, buffering, current, duration, failed],
  );
  const api = useMemo<PlayerApi>(() => ({ play, toggle, seek, skip, close }), [play, toggle, seek, skip, close]);

  const readDuration = (d: number) => {
    // Certains fichiers (WebM issus de MediaRecorder) annoncent une durée infinie.
    if (Number.isFinite(d) && d > 0) setMediaDuration(d);
  };

  return (
    <ApiContext.Provider value={api}>
      <StateContext.Provider value={state}>
        {children}
        <audio
          ref={audioRef}
          preload="none"
          onLoadedMetadata={(e) => readDuration(e.currentTarget.duration)}
          onDurationChange={(e) => readDuration(e.currentTarget.duration)}
          onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onWaiting={() => setBuffering(true)}
          onCanPlay={() => setBuffering(false)}
          onPlaying={() => setBuffering(false)}
          onError={() => {
            if (!trackRef.current) return;
            setFailed(true);
            setPlaying(false);
            setBuffering(false);
          }}
        />
      </StateContext.Provider>
    </ApiContext.Provider>
  );
}

export function usePlayer(): PlayerState {
  const context = useContext(StateContext);
  if (!context) throw new Error("usePlayer doit être utilisé dans un <PlayerProvider>.");
  return context;
}

export function usePlayerApi(): PlayerApi {
  const context = useContext(ApiContext);
  if (!context) throw new Error("usePlayerApi doit être utilisé dans un <PlayerProvider>.");
  return context;
}
