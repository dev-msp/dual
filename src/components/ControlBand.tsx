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
      {/* Statistics Section */}
      <div class="control-band__stats">
        <div class="control-band__stat">
          <div class="control-band__stat-label">Comparisons</div>
          <div class="control-band__stat-value">
            {props.stats.comparisonsCompleted}
          </div>
        </div>
        <Show when={props.stats.comparisonsCompleted > 0}>
          <div class="control-band__stat">
            <div class="control-band__stat-label">Wins</div>
            <div class="control-band__stat-value">{props.stats.wins}</div>
          </div>
          <div class="control-band__stat">
            <div class="control-band__stat-label">Losses</div>
            <div class="control-band__stat-value">{props.stats.losses}</div>
          </div>
          <div class="control-band__stat">
            <div class="control-band__stat-label">Draws</div>
            <div class="control-band__stat-value">{props.stats.draws}</div>
          </div>
          <div class="control-band__stat">
            <div class="control-band__stat-label">Skips</div>
            <div class="control-band__stat-value">{props.stats.skips}</div>
          </div>
        </Show>
      </div>

      {/* Controls Section */}
      <div class="control-band__controls">
        <div class="control-band__group">
          <label class="control-band__strategy-label">Strategy</label>
          <select
            class="control-band__select"
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
        </div>

        <label class="control-band__checkbox-label">
          <input
            type="checkbox"
            class="control-band__checkbox"
            checked={props.autoplay}
            onChange={props.onToggleAutoplay}
            aria-label="Autoplay tracks"
          />
          Autoplay
        </label>
      </div>

      {/* Action Buttons Section */}
      <div class="control-band__actions">
        <button
          class="btn-secondary btn-skip control-band__action-btn"
          onClick={props.onSkip}
          aria-label="Skip this comparison (press N)"
          title="Skip (N)"
        >
          Skip <span class="btn-badge">N</span>
        </button>
        <button
          class="btn-secondary btn-draw control-band__action-btn"
          onClick={props.onDraw}
          aria-label="Mark as draw (press D)"
          title="Draw (D)"
        >
          Draw <span class="btn-badge">D</span>
        </button>
      </div>
    </div>
  );
};
