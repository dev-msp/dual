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
  const [lastPairId, setLastPairId] = createSignal<string | null>(null);

  // Web Audio API state
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const decodedBuffers = new Map<number, AudioBuffer>();
  let currentSource: AudioBufferSourceNode | null = null;
  let startTime = 0;
  let pausedTime = 0;

  const MAX_CACHED_BUFFERS = 10;

  // Fetch and decode an MP3 track
  const fetchAndDecode = async (trackId: number): Promise<AudioBuffer> => {
    // Check cache first
    if (decodedBuffers.has(trackId)) {
      return decodedBuffers.get(trackId)!;
    }

    try {
      const response = await fetch(`/api/tracks/${trackId}/play`);
      if (!response.ok) {
        throw new Error(`Failed to fetch track: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      // Cache the decoded buffer
      decodedBuffers.set(trackId, audioBuffer);

      // Limit cache size
      if (decodedBuffers.size > MAX_CACHED_BUFFERS) {
        const firstKey = decodedBuffers.keys().next().value;
        decodedBuffers.delete(firstKey);
      }

      return audioBuffer;
    } catch (err) {
      console.error("Error decoding audio:", err);
      throw err;
    }
  };

  // Stop current playback
  const stopCurrentSource = () => {
    if (currentSource) {
      currentSource.stop();
      currentSource.disconnect();
      currentSource = null;
    }
  };

  // Create and play a source from buffer
  const playFromBuffer = (buffer: AudioBuffer) => {
    stopCurrentSource();

    currentSource = audioContext.createBufferSource();
    currentSource.buffer = buffer;
    currentSource.connect(audioContext.destination);

    // Handle track end
    currentSource.onended = () => {
      setIsPlaying(false);
      currentSource = null;

      // Autoplay next track if applicable
      if (currentTrack() === "A" && autoplay() && trackB()) {
        playTrack("B");
      }
    };

    startTime = audioContext.currentTime;
    pausedTime = 0;
    currentSource.start(0);
    setIsPlaying(true);
  };

  // Resume from paused position
  const resumeFromPausedTime = (buffer: AudioBuffer) => {
    stopCurrentSource();

    currentSource = audioContext.createBufferSource();
    currentSource.buffer = buffer;
    currentSource.connect(audioContext.destination);

    currentSource.onended = () => {
      setIsPlaying(false);
      currentSource = null;

      if (currentTrack() === "A" && autoplay() && trackB()) {
        playTrack("B");
      }
    };

    startTime = audioContext.currentTime - pausedTime;
    currentSource.start(0, pausedTime);
    setIsPlaying(true);
  };

  const playTrack = async (track: "A" | "B") => {
    const targetTrack = track === "A" ? trackA() : trackB();
    if (!targetTrack) return;

    // If same track and already loaded, just resume if paused
    if (currentTrack() === track && !isPlaying()) {
      if (decodedBuffers.has(targetTrack.id)) {
        resumeFromPausedTime(decodedBuffers.get(targetTrack.id)!);
      }
      return;
    }

    // If already playing this track, don't restart it
    if (currentTrack() === track && isPlaying()) {
      return;
    }

    setCurrentTrack(track);

    try {
      const buffer = await fetchAndDecode(targetTrack.id);
      playFromBuffer(buffer);
    } catch (err) {
      console.error("Error playing track:", err);
    }
  };

  const pause = () => {
    if (currentSource && isPlaying()) {
      pausedTime = audioContext.currentTime - startTime;
      stopCurrentSource();
      setIsPlaying(false);
    }
  };

  const resume = () => {
    if (currentTrack() && !isPlaying()) {
      const targetTrack = currentTrack() === "A" ? trackA() : trackB();
      if (targetTrack && decodedBuffers.has(targetTrack.id)) {
        resumeFromPausedTime(decodedBuffers.get(targetTrack.id)!);
      }
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
    stopCurrentSource();
    setCurrentTrack(null);
    setIsPlaying(false);
    pausedTime = 0;
    startTime = 0;
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

  onCleanup(() => {
    stopCurrentSource();
    decodedBuffers.clear();
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
