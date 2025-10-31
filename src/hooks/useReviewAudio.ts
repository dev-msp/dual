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
  cyclePlayback: () => void;
}

export function useReviewAudio(
  trackA: () => TrackSubset | null,
  trackB: () => TrackSubset | null,
  autoplay: () => boolean,
): [ReviewAudioState, ReviewAudioControls] {
  const [isPlaying, setIsPlaying] = createSignal(false);
  const [currentTrack, setCurrentTrack] = createSignal<"A" | "B" | null>(null);
  const [lastPairId, setLastPairId] = createSignal<string | null>(null);

  // Track paused positions for each track
  const [pausedPositionA, setPausedPositionA] = createSignal(0);
  const [pausedPositionB, setPausedPositionB] = createSignal(0);

  // Track cycle state: 0=paused, 1=playing A, 2=playing B
  const [cycleState, setCycleState] = createSignal(0);

  // Create single player instance
  const player = new AudioPlayer();

  // Wire up player callbacks to SolidJS signals
  player.setOnPlayingChanged(setIsPlaying);

  // This hook manages the A/B side tracking - the base player doesn't care
  const playTrack = async (side: "A" | "B", startTime?: number) => {
    const targetTrack = side === "A" ? trackA() : trackB();
    if (!targetTrack) return;

    // Save current position before switching tracks
    if (isPlaying() && currentTrack()) {
      const position = player.getCurrentTime();
      if (currentTrack() === "A") {
        setPausedPositionA(position);
      } else if (currentTrack() === "B") {
        setPausedPositionB(position);
      }
    }

    // Update which side we're playing before starting playback
    setCurrentTrack(side);

    // AudioPlayer prevents concurrent playback automatically
    await player.play(targetTrack.id, startTime);
  };

  const pause = () => {
    // Save current position before pausing
    if (isPlaying() && currentTrack()) {
      const position = player.getCurrentTime();
      if (currentTrack() === "A") {
        setPausedPositionA(position);
      } else if (currentTrack() === "B") {
        setPausedPositionB(position);
      }
    }
    player.pause();
  };

  const resume = () => player.resume();
  const toggle = () => player.toggle();
  const stop = () => {
    player.stop();
    setCurrentTrack(null);
  };

  // Cycle through: paused -> playing A -> playing B -> paused
  const cyclePlayback = () => {
    const nextState = (cycleState() + 1) % 3;
    setCycleState(nextState);

    if (nextState === 0) {
      // Pause
      if (isPlaying()) {
        pause();
      }
      setCurrentTrack(null);
    } else if (nextState === 1) {
      // Play A from saved position
      void playTrack("A", pausedPositionA());
    } else if (nextState === 2) {
      // Play B from saved position
      void playTrack("B", pausedPositionB());
    }
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
      // Reset paused positions for new pair
      setPausedPositionA(0);
      setPausedPositionB(0);
      setCycleState(0);
      void playTrack("A");
    } else if (!a || !b) {
      // Stop playback if tracks are cleared
      setLastPairId(null);
      setPausedPositionA(0);
      setPausedPositionB(0);
      setCycleState(0);
      stop();
    } else if (pairId && pairId !== prevPairId) {
      // New pair loaded - stop current playback and update pair ID
      setLastPairId(pairId);
      setPausedPositionA(0);
      setPausedPositionB(0);
      setCycleState(0);
      stop();
    }
  });

  // Set up autoplay continuation (A -> B) or reset state when autoplay is off
  player.setOnEnded(() => {
    if (currentTrack() === "A" && autoplay() && trackB()) {
      void playTrack("B");
    } else {
      // Reset current track when playback ends without autoplay
      setCurrentTrack(null);
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
      cyclePlayback,
    },
  ];
}
