import { createSignal, createEffect, onCleanup } from "solid-js";
import type { Track } from "../schemas/track";

export interface ReviewAudioState {
  currentTrack: "A" | "B" | null;
  isPlaying: boolean;
}

export interface ReviewAudioControls {
  playTrack: (track: "A" | "B") => void;
  pause: () => void;
  resume: () => void;
  toggle: () => void;
  stop: () => void;
}

export function useReviewAudio(
  trackA: () => Track | null,
  trackB: () => Track | null,
  autoplay: () => boolean,
): [ReviewAudioState, ReviewAudioControls] {
  const [currentTrack, setCurrentTrack] = createSignal<"A" | "B" | null>(null);
  const [isPlaying, setIsPlaying] = createSignal(false);
  const [audioElement] = createSignal(new Audio());
  const [lastPairId, setLastPairId] = createSignal<string | null>(null);
  const [shouldPlayOnCanPlay, setShouldPlayOnCanPlay] = createSignal(false);

  const audio = audioElement();
  audio.crossOrigin = "anonymous";

  // Set up audio element event listeners once with proper cleanup
  createEffect(() => {
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      // If track A just ended and autoplay is on, play track B
      if (currentTrack() === "A" && autoplay() && trackB()) {
        playTrack("B");
      }
    };
    const handleLoadedMetadata = () => {
      if (shouldPlayOnCanPlay()) {
        audio
          .play()
          .catch((err) => console.error("Error playing track:", err));
      }
    };
    const handlePlaying = () => {
      setShouldPlayOnCanPlay(false);
    };

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("playing", handlePlaying);

    onCleanup(() => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("playing", handlePlaying);
      audio.src = "";
    });
  });

  const playTrack = (track: "A" | "B") => {
    const targetTrack = track === "A" ? trackA() : trackB();
    if (!targetTrack) return;

    const src = `/api/tracks/${targetTrack.id}/play`;

    // If same track and same source, just resume
    if (currentTrack() === track && audio.src.endsWith(src)) {
      audio
        .play()
        .catch((err) => console.error("Error resuming playback:", err));
      return;
    }

    // Load and play new track - avoid pause() to prevent pops
    audio.src = src;
    audio.currentTime = 0;
    audio.load();
    setCurrentTrack(track);
    setShouldPlayOnCanPlay(true);
  };

  const pause = () => {
    audio.pause();
  };

  const resume = () => {
    if (currentTrack()) {
      audio
        .play()
        .catch((err) => console.error("Error resuming playback:", err));
    }
  };

  const toggle = () => {
    if (isPlaying()) {
      pause();
    } else {
      resume();
    }
  };

  const stop = () => {
    audio.pause();
    audio.src = "";
    setCurrentTrack(null);
    setIsPlaying(false);
  };

  // Auto-play effect when new pair loads
  createEffect(() => {
    const a = trackA();
    const b = trackB();
    const shouldAutoplay = autoplay();

    // Generate a unique ID for the current pair
    const pairId = a && b ? `${a.id}-${b.id}` : null;
    const prevPairId = lastPairId();

    // Only autoplay if this is a NEW pair (pair ID changed)
    if (pairId && pairId !== prevPairId && shouldAutoplay) {
      setLastPairId(pairId);
      // Automatically play track A when a new pair loads
      playTrack("A");
    } else if (!a || !b) {
      // Stop playback if tracks are cleared
      setLastPairId(null);
      stop();
    } else if (pairId && pairId !== prevPairId) {
      // Update pair ID even if autoplay is off
      setLastPairId(pairId);
    }
  });

  return [
    {
      get currentTrack() {
        return currentTrack();
      },
      get isPlaying() {
        return isPlaying();
      },
    },
    {
      playTrack,
      pause,
      resume,
      toggle,
      stop,
    },
  ];
}
