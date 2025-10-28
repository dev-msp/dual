import { useNavigate } from "@solidjs/router";
import * as rx from "rxjs";
import * as op from "rxjs/operators";
import { createEffect, Show, onCleanup } from "solid-js";
import z from "zod";

import { ComparisonCard } from "../components/ComparisonCard";
import { ControlBand } from "../components/ControlBand";
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
}

const comparisonResponseSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
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

      if (!data.success) {
        console.error("Comparison submission failed:", data.error);
      }
    } catch (err) {
      console.error("Error submitting comparison:", err);
    }
  };

  // Handle selection of track A
  const handleSelectA = () => {
    if (!reviewStore.currentPair) return;

    void submitComparison("win");
    recordComparison("win");
    fetchNewPair();
  };

  // Handle selection of track B
  const handleSelectB = () => {
    if (!reviewStore.currentPair) return;

    void submitComparison("loss");
    recordComparison("loss");
    fetchNewPair();
  };

  // Handle draw
  const handleDraw = () => {
    if (!reviewStore.currentPair) return;

    void submitComparison("draw");
    recordComparison("draw");
    fetchNewPair();
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
      <Show when={reviewStore.loading}>
        <div class="loading-overlay">
          <p>Loading comparison...</p>
        </div>
      </Show>

      <Show when={reviewStore.error}>
        <div class="error-banner" role="alert">
          <pre>
            <code>{JSON.stringify(reviewStore.error, null, 2)}</code>
          </pre>
          <button onClick={fetchNewPair}>Try Again</button>
          <button onClick={handleQuit}>Return Home</button>
        </div>
      </Show>

      <Show when={reviewStore.currentPair && !reviewStore.loading}>
        <div class="comparison-layout">
          <ComparisonCard
            track={trackA()!}
            side="A"
            keyHint="A"
            isPlaying={audioState.currentTrack === "A" && audioState.isPlaying}
            onPlay={() => audioControls.playTrack("A")}
            onSelect={handleSelectA}
          />

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

          <ComparisonCard
            track={trackB()!}
            side="B"
            keyHint="B"
            isPlaying={audioState.currentTrack === "B" && audioState.isPlaying}
            onPlay={() => audioControls.playTrack("B")}
            onSelect={handleSelectB}
          />
        </div>

        <div class="review-footer">
          <button class="btn-quit" onClick={handleQuit}>
            Return Home <kbd>Q</kbd>
          </button>
        </div>
      </Show>
    </div>
  );
};
