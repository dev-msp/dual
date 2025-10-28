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
      {/* Album Artwork Section */}
      <div class="comparison-card__artwork">
        <Show
          when={props.track.artwork}
          fallback={
            <div class="comparison-card__artwork-placeholder">
              ♫
            </div>
          }
        >
          <img
            src={props.track.artwork}
            alt={`${props.track.title} album artwork`}
            loading="lazy"
          />
        </Show>
        <div class="comparison-card__artwork-overlay" />
      </div>

      {/* Content Section */}
      <div class="comparison-card__content">
        {/* Header with Track Label and Score */}
        <div class="comparison-card__header">
          <span class="comparison-card__label">Track {props.side}</span>
          <div class="comparison-card__score">
            <span class="comparison-card__score-label">Score</span>
            <Show when={props.track.score !== null && props.track.score !== undefined}>
              <span class="comparison-card__score-value">
                {props.track.score!.toFixed(0)}
              </span>
            </Show>
          </div>
        </div>

        {/* Track Information */}
        <h2 class="comparison-card__title">
          {props.track.title || "Unknown Track"}
        </h2>
        <p class="comparison-card__artist">
          {props.track.artist || "Unknown Artist"}
        </p>
        <Show when={props.track.album}>
          <p class="comparison-card__album">
            {props.track.album}
          </p>
        </Show>

        {/* Footer with Keyboard Hint and Actions */}
        <div class="comparison-card__footer">
          <div
            class="comparison-card__key-hint"
            aria-label={`Press ${props.keyHint} to select`}
          >
            <small>
              Press <kbd class="btn-badge">{props.keyHint}</kbd> or click
            </small>
          </div>

          <div class="comparison-card__actions">
            <button
              class="btn-primary btn-play comparison-card__action-btn"
              onClick={props.onPlay}
              aria-label={props.isPlaying ? "Pause track" : "Play track"}
              title={props.isPlaying ? "Pause" : "Play"}
            >
              {props.isPlaying ? "⏸" : "▶"} Play
            </button>

            <button
              class="btn-primary btn-select comparison-card__action-btn"
              onClick={props.onSelect}
              aria-label={`Select track ${props.side} as winner`}
              title={`Select Track ${props.side}`}
            >
              Select
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
