import { Show } from "solid-js";
import type { SessionStats, SelectionStrategy } from "../stores/reviewStore";

export interface ControlBandProps {
  stats: SessionStats;
  strategy: SelectionStrategy;
  autoplay: boolean;
  onSkip: () => void;
  onDraw: () => void;
  onStrategyChange: (strategy: SelectionStrategy) => void;
  onToggleAutoplay: () => void;
}

export const ControlBand = (props: ControlBandProps) => {
  return (
    <div class="control-band" role="toolbar" aria-label="Review controls">
      <div class="control-section stats">
        <span class="stat-item">
          <strong>{props.stats.comparisonsCompleted}</strong> comparisons
        </span>
        <Show when={props.stats.comparisonsCompleted > 0}>
          <span class="stat-breakdown">
            (W: {props.stats.wins} / L: {props.stats.losses} / D:{" "}
            {props.stats.draws} / S: {props.stats.skips})
          </span>
        </Show>
      </div>

      <div class="control-section actions">
        <button
          class="btn-action btn-skip"
          onClick={props.onSkip}
          aria-label="Skip this comparison (press N)"
          title="Skip (N)"
        >
          Skip <kbd>N</kbd>
        </button>
        <button
          class="btn-action btn-draw"
          onClick={props.onDraw}
          aria-label="Mark as draw (press D)"
          title="Draw (D)"
        >
          Draw <kbd>D</kbd>
        </button>
      </div>

      <div class="control-section settings">
        <label class="setting-item">
          <span>Strategy:</span>
          <select
            value={props.strategy}
            onChange={(e) =>
              props.onStrategyChange(e.currentTarget.value as SelectionStrategy)
            }
            aria-label="Selection strategy"
          >
            <option value="random">Random</option>
            <option value="uncertain">Uncertain</option>
            <option value="similar_scores">Similar Scores</option>
          </select>
        </label>

        <label class="setting-item checkbox">
          <input
            type="checkbox"
            checked={props.autoplay}
            onChange={props.onToggleAutoplay}
            aria-label="Autoplay tracks"
          />
          <span>Autoplay</span>
        </label>
      </div>
    </div>
  );
};
