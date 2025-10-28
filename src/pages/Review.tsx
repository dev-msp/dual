import { useNavigate } from "@solidjs/router";
import * as rx from "rxjs";
import * as op from "rxjs/operators";
import { createEffect, Show, onCleanup, createSignal } from "solid-js";
import z from "zod";

import { ComparisonCard } from "../components/ComparisonCard";
import { ControlBand } from "../components/ControlBand";
import { ScoreDisplay, type ScoreUpdateInfo } from "../components/ScoreDisplay";
import { useKeyboard } from "../hooks/useKeyboard";
import { useReviewAudio } from "../hooks/useReviewAudio";
import { filterMap } from "../lib/reactive";
import {
  reviewStore,
  setCurrentPair,
  setLoading,
  setError,
  recordComparison,
  updateSettings,
  toggleAutoplay,
  type TrackPair,
  type ReviewSettings,
  type TrackSubset,
  trackSubset,
} from "../stores/reviewStore";

interface PairResponse {
  success: boolean;
  pairs?: Array<{
    trackA: TrackSubset;
    trackB: TrackSubset;
  }>;
  error?: string;
}
const pairsResponseSchema = z.object({
  success: z.boolean(),
  pairs: z
    .array(
      z.object({
        trackA: trackSubset,
        trackB: trackSubset,
      }),
    )
    .optional(),
  error: z.string().optional(),
});

interface ComparisonResponse {
  success: boolean;
  error?: string;
  trackA?: {
    id: number;
    oldRating: number;
    newRating: number;
    change: number;
  };
  trackB?: {
    id: number;
    oldRating: number;
    newRating: number;
    change: number;
  };
}

const comparisonResponseSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
  trackA: z
    .object({
      id: z.number(),
      oldRating: z.number(),
      newRating: z.number(),
      change: z.number(),
    })
    .optional(),
  trackB: z
    .object({
      id: z.number(),
      oldRating: z.number(),
      newRating: z.number(),
      change: z.number(),
    })
    .optional(),
});

// RxJs Primitives for pair fetching

/** Extract request params from current settings */
const buildPairRequestParams = (settings: ReviewSettings): URLSearchParams => {
  return new URLSearchParams({
    strategy: settings.selectionStrategy,
    count: "1",
    ...(settings.filterOrder && { order: settings.filterOrder }),
    ...(settings.filterLimit && {
      limit: settings.filterLimit.toString(),
    }),
    uncertaintyWindow: settings.uncertaintyWindow.toString(),
  });
};

/** Perform fetch operation and return promise */
const fetchPairResponse = (params: URLSearchParams): Promise<PairResponse> =>
  fetch(`/api/pairs?${params}`)
    .then((response) => response.json())
    .then((json) => pairsResponseSchema.parse(json));

/** Validate and extract pair from response */
const validateAndExtractPair = (response: PairResponse): TrackPair | null => {
  if (response.success && response.pairs && response.pairs.length > 0) {
    return {
      trackA: response.pairs[0].trackA,
      trackB: response.pairs[0].trackB,
    };
  }
  return null;
};

/** Apply loading state change */
const applyLoadingState = (loading: boolean): void => {
  setLoading(loading);
};

/** Apply pair to store */
const applyPairToStore = (pair: TrackPair): void => {
  setCurrentPair(pair);
};

/** Apply error to store */
const applyErrorToStore = (error: string): void => {
  setError(error);
};

/** Create the complete pair fetching pipeline */
const createPairFetchPipeline = () => {
  // Trigger subject for requesting new pairs
  const requestNewPair$ = new rx.Subject<void>();

  // Main pipeline: convert void trigger to pair fetch
  const pairFetch$ = requestNewPair$.pipe(
    // Set loading state on request start
    op.tap(() => applyLoadingState(true)),
    // Clear previous errors
    op.tap(() => applyErrorToStore("")),
    // Get current settings and build params
    op.map(() => buildPairRequestParams(reviewStore.settings)),
    // Fetch from API
    op.switchMap((params) => rx.from(fetchPairResponse(params))),
    // Validate response and extract pair
    op.map(validateAndExtractPair),
    // Apply pair to store if valid, handle errors
    op.tap((pair) => {
      if (pair) {
        applyPairToStore(pair);
      }
    }),
    // Filter out null pairs
    filterMap((pair) => pair),
    // Handle success: clear loading
    op.tap(() => applyLoadingState(false)),
    // Catch errors and convert to error message
    op.catchError((error: unknown) => {
      console.error("Error fetching pair:", error);
      const errorMsg =
        error instanceof Error
          ? error.message
          : "Failed to fetch comparison pair";
      applyErrorToStore(errorMsg);
      applyLoadingState(false);
      return rx.EMPTY;
    }),
    // Share to prevent duplicate requests
    op.share(),
  );

  return { requestNewPair$, pairFetch$ };
};

export const Review = () => {
  const navigate = useNavigate();

  const trackA = () => reviewStore.currentPair?.trackA ?? null;
  const trackB = () => reviewStore.currentPair?.trackB ?? null;
  const autoplay = () => reviewStore.settings.autoplay;

  // State for score display
  const [scoreUpdateA, setScoreUpdateA] = createSignal<ScoreUpdateInfo | null>(null);
  const [scoreUpdateB, setScoreUpdateB] = createSignal<ScoreUpdateInfo | null>(null);
  const [isShowingScores, setIsShowingScores] = createSignal(false);

  const [audioState, audioControls] = useReviewAudio(trackA, trackB, autoplay);

  // Create the RxJs pair fetching pipeline
  const { requestNewPair$, pairFetch$ } = createPairFetchPipeline();

  // Set up subscription to pair fetch pipeline
  createEffect(() => {
    const subscription = pairFetch$.subscribe({
      // Pipeline handles store updates via tap operators
    });
    onCleanup(() => subscription.unsubscribe());
  });

  // Trigger a new pair fetch by emitting on the subject
  const fetchNewPair = () => {
    requestNewPair$.next();
  };

  // Handle score display completion
  const handleScoreDisplayComplete = () => {
    setIsShowingScores(false);
    setScoreUpdateA(null);
    setScoreUpdateB(null);
    // Fetch the next pair after score display is done
    fetchNewPair();
  };

  // Submit comparison result to the API
  const submitComparison = async (result: "win" | "loss" | "draw") => {
    const pair = reviewStore.currentPair;
    if (!pair) return;

    try {
      const response = await fetch("/api/comparison", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackAId: pair.trackA.id,
          trackBId: pair.trackB.id,
          result,
          kFactor: reviewStore.settings.kFactor,
        }),
      });

      const data: ComparisonResponse = comparisonResponseSchema.parse(
        await response.json(),
      );

      if (data.success && data.trackA && data.trackB) {
        // Store the score updates and show the display
        setScoreUpdateA({
          side: "A",
          oldRating: data.trackA.oldRating,
          newRating: data.trackA.newRating,
          change: data.trackA.change,
        });
        setScoreUpdateB({
          side: "B",
          oldRating: data.trackB.oldRating,
          newRating: data.trackB.newRating,
          change: data.trackB.change,
        });
        setIsShowingScores(true);
      } else if (!data.success) {
        console.error("Comparison submission failed:", data.error);
        // Still fetch next pair on error
        fetchNewPair();
      }
    } catch (err) {
      console.error("Error submitting comparison:", err);
      // Still fetch next pair on error
      fetchNewPair();
    }
  };

  // Handle selection of track A
  const handleSelectA = () => {
    if (!reviewStore.currentPair) return;

    void submitComparison("win");
    recordComparison("win");
  };

  // Handle selection of track B
  const handleSelectB = () => {
    if (!reviewStore.currentPair) return;

    void submitComparison("loss");
    recordComparison("loss");
  };

  // Handle draw
  const handleDraw = () => {
    if (!reviewStore.currentPair) return;

    void submitComparison("draw");
    recordComparison("draw");
  };

  // Handle skip
  const handleSkip = () => {
    recordComparison("skip");
    fetchNewPair();
  };

  // Handle quit
  const handleQuit = () => {
    navigate("/");
  };

  // Set up keyboard shortcuts
  useKeyboard({
    onSelectA: handleSelectA,
    onSelectB: handleSelectB,
    onDraw: handleDraw,
    onSkip: handleSkip,
    onQuit: handleQuit,
  });

  // Fetch initial pair on mount
  createEffect(() => {
    if (!reviewStore.currentPair) {
      fetchNewPair();
    }
  }, []);

  return (
    <div class="review-container">
      {/* Score Display Overlay */}
      <Show when={isShowingScores()}>
        <ScoreDisplay
          trackA={scoreUpdateA()}
          trackB={scoreUpdateB()}
          onComplete={handleScoreDisplayComplete}
        />
      </Show>

      {/* Loading State */}
      <Show when={reviewStore.loading}>
        <div class="review-loading" role="status" aria-live="polite">
          <p>Loading comparison...</p>
        </div>
      </Show>

      {/* Error State */}
      <Show when={reviewStore.error}>
        <div class="review-error" role="alert">
          <div class="review-error-title">Error Loading Comparison</div>
          <div class="review-error-message">
            <pre>
              <code>{JSON.stringify(reviewStore.error, null, 2)}</code>
            </pre>
          </div>
          <div class="review-actions">
            <button class="btn-primary" onClick={fetchNewPair}>
              Try Again
            </button>
            <button class="btn-subtle" onClick={handleQuit}>
              Return Home
            </button>
          </div>
        </div>
      </Show>

      {/* Main Content */}
      <Show when={reviewStore.currentPair && !reviewStore.loading}>
        <div class="review-content">
          {/* Comparison Cards Section */}
          <div class="review-comparison">
            <div class="review-track">
              <ComparisonCard
                track={trackA()!}
                side="A"
                keyHint="A"
                isPlaying={audioState.currentTrack === "A" && audioState.isPlaying}
                onPlay={() => audioControls.playTrack("A")}
                onSelect={handleSelectA}
              />
            </div>

            <div class="review-vs-divider">vs</div>

            <div class="review-track">
              <ComparisonCard
                track={trackB()!}
                side="B"
                keyHint="B"
                isPlaying={audioState.currentTrack === "B" && audioState.isPlaying}
                onPlay={() => audioControls.playTrack("B")}
                onSelect={handleSelectB}
              />
            </div>
          </div>

          {/* Control Band */}
          <ControlBand
            stats={reviewStore.stats}
            strategy={reviewStore.settings.selectionStrategy}
            autoplay={reviewStore.settings.autoplay}
            onSkip={handleSkip}
            onDraw={handleDraw}
            onStrategyChange={(strategy) =>
              updateSettings({ selectionStrategy: strategy })
            }
            onToggleAutoplay={toggleAutoplay}
          />

          {/* Return Home Button */}
          <div class="review-footer">
            <button
              class="btn-subtle btn-return"
              onClick={handleQuit}
              aria-label="Return to home (press Q)"
              title="Return Home (Q)"
            >
              Return Home <span class="btn-badge">Q</span>
            </button>
          </div>
        </div>
      </Show>
    </div>
  );
};
