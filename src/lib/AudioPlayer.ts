type PlayerStateType = "IDLE" | "LOADING" | "PLAYING" | "PAUSED";

interface PlayerState {
  type: PlayerStateType;
  trackId?: number;
}

export class AudioPlayer {
  private state: PlayerState = { type: "IDLE" };
  private audioContext: AudioContext;
  private currentSource: AudioBufferSourceNode | null = null;
  private bufferCache: Map<number, AudioBuffer> = new Map();
  private pausedTime: number = 0;
  private startTime: number = 0;
  private readonly MAX_CACHED_BUFFERS = 10;

  // Callbacks for reactive state updates
  private onPlayingChanged?: (isPlaying: boolean) => void;
  private onEnded?: () => void;

  constructor() {
    this.audioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
  }

  // ============ Public API ============

  /**
   * Play a track. If already loading, this request is ignored.
   * If playing a different track, stops current playback and starts the new one.
   */
  async play(trackId: number): Promise<void> {
    // Ignore if already loading this track
    if (this.state.type === "LOADING" && this.state.trackId === trackId) {
      return;
    }

    // If already playing this track, ignore
    if (
      (this.state.type === "PLAYING" || this.state.type === "PAUSED") &&
      this.state.trackId === trackId
    ) {
      return;
    }

    // Transition to LOADING state
    this.transitionTo({ type: "LOADING", trackId });

    try {
      const buffer = await this.fetchAndDecode(trackId);
      this.playFromBuffer(buffer, trackId);
    } catch (err) {
      console.error("Error playing track:", err);
      this.transitionTo({ type: "IDLE" });
    }
  }

  /**
   * Pause playback (only valid in PLAYING state)
   */
  pause(): void {
    if (this.state.type !== "PLAYING") {
      return;
    }

    this.pausedTime = this.audioContext.currentTime - this.startTime;
    this.stopSource();

    const { trackId } = this.state;
    this.transitionTo({
      type: "PAUSED",
      trackId,
    });
  }

  /**
   * Resume playback (only valid in PAUSED state)
   */
  resume(): void {
    if (this.state.type !== "PAUSED" || !this.state.trackId) {
      return;
    }

    const buffer = this.bufferCache.get(this.state.trackId);
    if (!buffer) {
      return;
    }

    this.resumeFromPausedTime(buffer, this.state.trackId);
  }

  /**
   * Stop playback and return to IDLE
   */
  stop(): void {
    this.stopSource();
    this.pausedTime = 0;
    this.startTime = 0;
    this.transitionTo({ type: "IDLE" });
  }

  /**
   * Toggle between playing and paused
   */
  toggle(): void {
    if (this.state.type === "PLAYING") {
      this.pause();
    } else if (this.state.type === "PAUSED") {
      this.resume();
    }
  }

  /**
   * Check if audio is currently playing
   */
  get isPlaying(): boolean {
    return this.state.type === "PLAYING";
  }

  /**
   * Register callback for playback state changes
   */
  setOnPlayingChanged(callback: (isPlaying: boolean) => void): void {
    this.onPlayingChanged = callback;
  }

  /**
   * Register callback for track ended
   */
  setOnEnded(callback: () => void): void {
    this.onEnded = callback;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stopSource();
    this.bufferCache.clear();
  }

  // ============ Private Methods ============

  /**
   * Transition to a new state, running appropriate cleanup/setup
   */
  private transitionTo(newState: PlayerState): void {
    const oldState = this.state;
    this.state = newState;

    // Notify of playing state changes
    const wasPlaying = oldState.type === "PLAYING";
    const isNowPlaying = newState.type === "PLAYING";
    if (wasPlaying !== isNowPlaying) {
      this.onPlayingChanged?.(isNowPlaying);
    }
  }

  /**
   * Stop the current audio source and disconnect it
   */
  private stopSource(): void {
    if (this.currentSource) {
      // Clear the onended handler to prevent stale events from firing
      // after a new track has started playing
      this.currentSource.onended = null;
      try {
        this.currentSource.stop();
        this.currentSource.disconnect();
      } catch (e) {
        // source might already be stopped
      }
      this.currentSource = null;
    }
  }

  /**
   * Fetch an MP3 and decode it to AudioBuffer
   */
  private async fetchAndDecode(trackId: number): Promise<AudioBuffer> {
    // Return cached buffer if available
    if (this.bufferCache.has(trackId)) {
      return this.bufferCache.get(trackId)!;
    }

    const response = await fetch(`/api/tracks/${trackId}/play`);
    if (!response.ok) {
      throw new Error(`Failed to fetch track: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

    // Cache the decoded buffer
    this.bufferCache.set(trackId, audioBuffer);

    // Limit cache size to prevent memory bloat
    if (this.bufferCache.size > this.MAX_CACHED_BUFFERS) {
      const firstKey = this.bufferCache.keys().next().value;
      if (firstKey === undefined) {
        throw new Error("Unexpected undefined key in buffer cache");
      }
      // eslint-disable-next-line drizzle/enforce-delete-with-where
      this.bufferCache.delete(firstKey);
    }

    return audioBuffer;
  }

  /**
   * Create a new source and play it from the beginning
   */
  private playFromBuffer(buffer: AudioBuffer, trackId: number): void {
    this.stopSource();

    this.currentSource = this.audioContext.createBufferSource();
    this.currentSource.buffer = buffer;
    this.currentSource.connect(this.audioContext.destination);

    // Set up end-of-track handler
    this.currentSource.onended = () => {
      // Only transition if we're still in PLAYING state (might have been stopped)
      if (this.state.type === "PLAYING") {
        this.transitionTo({ type: "IDLE" });
        this.onEnded?.();
      }
    };

    this.startTime = this.audioContext.currentTime;
    this.pausedTime = 0;
    this.currentSource.start(0);

    this.transitionTo({ type: "PLAYING", trackId });
  }

  /**
   * Create a new source and resume from a paused position
   */
  private resumeFromPausedTime(buffer: AudioBuffer, trackId: number): void {
    this.stopSource();

    this.currentSource = this.audioContext.createBufferSource();
    this.currentSource.buffer = buffer;
    this.currentSource.connect(this.audioContext.destination);

    this.currentSource.onended = () => {
      if (this.state.type === "PLAYING") {
        this.transitionTo({ type: "IDLE" });
        this.onEnded?.();
      }
    };

    this.startTime = this.audioContext.currentTime - this.pausedTime;
    this.currentSource.start(0, this.pausedTime);

    this.transitionTo({ type: "PLAYING", trackId });
  }
}
