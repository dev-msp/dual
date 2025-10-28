import { createSignal, createEffect, onCleanup } from "solid-js";

import { AudioPlayer } from "../lib/AudioPlayer";
import type { TrackSubset } from "../stores/reviewStore";

export interface ReviewAudioState {
  currentTrack: "A" | "B" | null;
  isPlaying: boolean;
}

export interface ReviewAudioControls {
  playTrack: (track: "A" | "B") => Promise<void>;
  pause: () => void;
  resume: () => void;
  toggle: () => void;
  stop: () => void;
}

export function useReviewAudio(
  trackA: () => TrackSubset | null,
  trackB: () => TrackSubset | null,
  autoplay: () => boolean,
): [ReviewAudioState, ReviewAudioControls] {
  const [isPlaying, setIsPlaying] = createSignal(false);
  const [currentTrack, setCurrentTrack] = createSignal<"A" | "B" | null>(null);
  const [lastPairId, setLastPairId] = createSignal<string | null>(null);

  // Create single player instance
  const player = new AudioPlayer();

  // Wire up player callbacks to SolidJS signals
  player.setOnPlayingChanged(setIsPlaying);

  // This hook manages the A/B side tracking - the base player doesn't care
  const playTrack = async (side: "A" | "B") => {
    const targetTrack = side === "A" ? trackA() : trackB();
    if (!targetTrack) return;

    // Update which side we're playing before starting playback
    setCurrentTrack(side);

    // AudioPlayer prevents concurrent playback automatically
    await player.play(targetTrack.id);
  };

  const pause = () => player.pause();
  const resume = () => player.resume();
  const toggle = () => player.toggle();
  const stop = () => {
    player.stop();
    setCurrentTrack(null);
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
      void playTrack("A");
    } else if (!a || !b) {
      // Stop playback if tracks are cleared
      setLastPairId(null);
      stop();
    } else if (pairId && pairId !== prevPairId) {
      // Update pair ID even if autoplay is off
      setLastPairId(pairId);
    }
  });

  // Set up autoplay continuation (A -> B)
  player.setOnEnded(() => {
    if (currentTrack() === "A" && autoplay() && trackB()) {
      void playTrack("B");
    }
  });

  onCleanup(() => {
    player.destroy();
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
