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

  const audio = audioElement();

  // Set up audio element event listeners
  audio.addEventListener("play", () => setIsPlaying(true));
  audio.addEventListener("pause", () => setIsPlaying(false));
  audio.addEventListener("ended", () => {
    setIsPlaying(false);
    // If track A just ended and autoplay is on, play track B
    if (currentTrack() === "A" && autoplay() && trackB()) {
      playTrack("B");
    }
  });

  onCleanup(() => {
    audio.pause();
    audio.src = "";
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

    // Load and play new track
    audio.pause();
    audio.src = src;
    setCurrentTrack(track);
    audio
      .play()
      .catch((err) => console.error("Error playing track:", err));
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

    if (a && b && shouldAutoplay) {
      // Automatically play track A when a new pair loads
      playTrack("A");
    } else {
      // Stop playback if tracks are cleared
      if (!a || !b) {
        stop();
      }
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
