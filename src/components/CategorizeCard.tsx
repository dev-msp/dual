import { createEffect, For, Show } from "solid-js";

import type { TrackSubset } from "../stores/categorizeStore";

export interface CategorizeCardProps {
  track: TrackSubset;
  buckets: string[];
  bucketValues: Record<string, string[]>;
  currentValues: Record<string, string>;
  loading: boolean;
  albumMode: boolean;
  albumTrackCount: number | null;
  keymapSequence: string[];
  onValueChange: (bucket: string, value: string) => void;
  onSubmit: () => void;
  onSkip: () => void;
  onAlbumModeChange: (enabled: boolean) => void;
}

export const CategorizeCard = (props: CategorizeCardProps) => {
  createEffect(() => {
    console.log("CategorizeCard props:", props.track);
  });
  return (
    <div class="categorize-card">
      {/* Track Info */}
      <div class="categorize-card__header">
        <Show
          when={props.track.artPath}
          fallback={<div class="categorize-card__artwork-placeholder">♫</div>}
        >
          <img
            src={props.track.artPath ?? undefined}
            alt={`${props.track.title} album artwork`}
            class="categorize-card__artwork"
            loading="lazy"
          />
        </Show>

        <div class="categorize-card__info">
          <h2 class="categorize-card__title">
            {props.track.title || "Unknown Track"}
          </h2>
          <p class="categorize-card__artist">
            {props.track.artist || "Unknown Artist"}
          </p>
          <Show when={props.track.album}>
            <p class="categorize-card__album">{props.track.album}</p>
          </Show>
        </div>
      </div>

      {/* Album Mode Toggle */}
      <Show when={props.track.album_id}>
        <div
          class={`categorize-card__album-mode ${
            props.albumMode ? "categorize-card__album-mode--active" : ""
          }`}
        >
          <label class="categorize-card__album-mode-label">
            <input
              type="checkbox"
              class="categorize-card__album-mode-toggle"
              checked={props.albumMode}
              onChange={(e) => props.onAlbumModeChange(e.currentTarget.checked)}
              disabled={props.loading}
              title="Toggle album mode (A)"
            />
            <span class="categorize-card__album-mode-text">
              Categorize entire album
            </span>
            <Show when={props.albumMode && props.albumTrackCount !== null}>
              <span class="categorize-card__album-track-count">
                ({props.albumTrackCount} tracks)
              </span>
            </Show>
          </label>
        </div>
      </Show>

      {/* Bucket Inputs */}
      <div class="categorize-card__inputs">
        <For each={props.buckets}>
          {(bucket, bucketIndex) => {
            const isOtherSelected = () => {
              const val = props.currentValues[bucket];
              return val && !props.bucketValues[bucket]?.includes(val);
            };

            // Calculate the global offset for this bucket's options
            const getGlobalOffset = () => {
              let offset = 0;
              for (let i = 0; i < bucketIndex(); i++) {
                const prevBucket = props.buckets[i];
                offset += (props.bucketValues[prevBucket] || []).length;
              }
              return offset;
            };

            return (
              <div class="categorize-card__input-group">
                <label class="categorize-card__input-label">{bucket}</label>
                <div class="categorize-card__button-group">
                  <For each={props.bucketValues[bucket] || []}>
                    {(value, index) => {
                      const globalIndex = () => getGlobalOffset() + index();
                      const keymapKey = () => props.keymapSequence[globalIndex()];

                      return (
                        <button
                          class={`categorize-card__option-btn ${
                            props.currentValues[bucket] === value
                              ? "categorize-card__option-btn--selected"
                              : ""
                          }`}
                          onClick={() => props.onValueChange(bucket, value)}
                          disabled={props.loading}
                          type="button"
                          title={keymapKey() ? `${value} (${keymapKey()})` : value}
                        >
                          {value}
                          <Show when={keymapKey()}>
                            <span class="btn-badge">{keymapKey()}</span>
                          </Show>
                        </button>
                      );
                    }}
                  </For>
                  <button
                    class={`categorize-card__option-btn categorize-card__option-btn--other ${
                      isOtherSelected()
                        ? "categorize-card__option-btn--selected"
                        : ""
                    }`}
                    onClick={() => {
                      if (!isOtherSelected()) {
                        props.onValueChange(bucket, "");
                      }
                    }}
                    disabled={props.loading}
                    type="button"
                    title="other"
                  >
                    other
                  </button>
                </div>
                <Show when={isOtherSelected()}>
                  <div class="categorize-card__other-input">
                    <input
                      type="text"
                      class="categorize-card__input"
                      placeholder={`Enter custom ${bucket}...`}
                      value={props.currentValues[bucket] || ""}
                      onInput={(e) =>
                        props.onValueChange(bucket, e.currentTarget.value)
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          props.onSubmit();
                        }
                      }}
                      disabled={props.loading}
                      autocomplete="off"
                      autofocus
                    />
                  </div>
                </Show>
              </div>
            );
          }}
        </For>
      </div>

      {/* Actions */}
      <div class="categorize-card__actions">
        <button
          class="btn-primary categorize-card__submit-btn"
          onClick={props.onSubmit}
          disabled={
            !Object.values(props.currentValues).every(
              (v) => v && v.trim() !== "",
            ) || props.loading
          }
        >
          Submit <span class="btn-badge">Enter</span>
        </button>
        <button
          class="btn-secondary categorize-card__skip-btn"
          onClick={props.onSkip}
          disabled={props.loading}
        >
          Skip
        </button>
      </div>
    </div>
  );
};
