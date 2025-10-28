import { createSignal, Show, createEffect, onCleanup } from "solid-js";

export interface ScoreUpdateInfo {
  side: "A" | "B";
  oldRating: number;
  newRating: number;
  change: number;
}

export interface ScoreDisplayProps {
  trackA: ScoreUpdateInfo | null;
  trackB: ScoreUpdateInfo | null;
  onComplete: () => void;
  autoAdvanceTime?: number;
}

export const ScoreDisplay = (props: ScoreDisplayProps) => {
  const [isVisible, setIsVisible] = createSignal(true);
  const [advanceTimer, setAdvanceTimer] = createSignal<number | undefined>();

  createEffect(() => {
    if (!isVisible()) return;

    // Set up auto-advance timer (3 seconds by default)
    const timer = window.setTimeout(() => {
      handleComplete();
    }, props.autoAdvanceTime ?? 3000);

    setAdvanceTimer(timer);

    // Set up keyboard listener to skip
    const handleKeyPress = () => {
      handleComplete();
    };

    window.addEventListener("keydown", handleKeyPress);

    onCleanup(() => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyPress);
    });
  });

  const handleComplete = () => {
    setIsVisible(false);
    if (advanceTimer()) {
      window.clearTimeout(advanceTimer());
    }
    props.onComplete();
  };

  const getChangeClass = (change: number) => {
    if (change > 0) return "score-display__change--increase";
    if (change < 0) return "score-display__change--decrease";
    return "score-display__change--neutral";
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return "↑";
    if (change < 0) return "↓";
    return "=";
  };

  const formatChange = (change: number) => {
    const sign = change > 0 ? "+" : "";
    return `${sign}${change.toFixed(0)}`;
  };

  return (
    <Show when={isVisible()}>
      <div class="score-display" role="status" aria-live="assertive">
        <div class="score-display__overlay" />

        <div class="score-display__container">
          <div class="score-display__message">
            <p>New scores calculated</p>
          </div>

          <div class="score-display__scores">
            {/* Track A Score */}
            <Show when={props.trackA}>
              {(trackA) => (
                <div class="score-display__track score-display__track--a">
                  <div class="score-display__track-label">Track A</div>

                  <div class="score-display__score-container">
                    <span class="score-display__old-score">
                      {trackA().oldRating.toFixed(0)}
                    </span>

                    <div class={`score-display__change ${getChangeClass(trackA().change)}`}>
                      <span class="score-display__change-icon">
                        {getChangeIcon(trackA().change)}
                      </span>
                      <span class="score-display__change-value">
                        {formatChange(trackA().change)}
                      </span>
                    </div>

                    <span class="score-display__new-score">
                      {trackA().newRating.toFixed(0)}
                    </span>
                  </div>
                </div>
              )}
            </Show>

            {/* Track B Score */}
            <Show when={props.trackB}>
              {(trackB) => (
                <div class="score-display__track score-display__track--b">
                  <div class="score-display__track-label">Track B</div>

                  <div class="score-display__score-container">
                    <span class="score-display__old-score">
                      {trackB().oldRating.toFixed(0)}
                    </span>

                    <div class={`score-display__change ${getChangeClass(trackB().change)}`}>
                      <span class="score-display__change-icon">
                        {getChangeIcon(trackB().change)}
                      </span>
                      <span class="score-display__change-value">
                        {formatChange(trackB().change)}
                      </span>
                    </div>

                    <span class="score-display__new-score">
                      {trackB().newRating.toFixed(0)}
                    </span>
                  </div>
                </div>
              )}
            </Show>
          </div>

          <div class="score-display__footer">
            <p class="score-display__hint">
              Press any key to continue, or wait 3 seconds
            </p>
          </div>
        </div>
      </div>
    </Show>
  );
};
