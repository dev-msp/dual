import { Show } from "solid-js";

import type { TrackSubset } from "../stores/reviewStore";

export interface ComparisonCardProps {
  track: TrackSubset;
  side: "A" | "B";
  keyHint: string;
  isPlaying: boolean;
  onPlay: () => void;
  onSelect: () => void;
}

export const ComparisonCard = (props: ComparisonCardProps) => {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div
      class="comparison-card"
      role="article"
      aria-label={`Track ${props.side}: ${props.track.title}`}
    >
      <div class="card-header">
        <div class="card-side-label">Track {props.side}</div>
        <div
          class="card-key-hint"
          aria-label={`Press ${props.keyHint} to select`}
        >
          Key: <kbd>{props.keyHint}</kbd>
        </div>
      </div>

      <div class="card-content">
        <div class="track-info">
          <h2 class="track-title">{props.track.title || "Unknown Track"}</h2>
          <p class="track-artist">{props.track.artist || "Unknown Artist"}</p>
          <p class="track-album">{props.track.album || "Unknown Album"}</p>

          <div class="track-metadata">
            <Show
              when={
                props.track.score !== null && props.track.score !== undefined
              }
            >
              <span class="metadata-item score">
                Score: {props.track.score!.toFixed(0)}
              </span>
            </Show>
          </div>
        </div>

        <div class="card-actions">
          <button
            class="btn-play"
            onClick={props.onPlay}
            aria-label={props.isPlaying ? "Pause track" : "Play track"}
          >
            {props.isPlaying ? "⏸" : "▶"}
          </button>

          <button
            class="btn-select"
            onClick={props.onSelect}
            aria-label={`Select track ${props.side} as winner`}
          >
            Select Track {props.side}
          </button>
        </div>
      </div>
    </div>
  );
};
