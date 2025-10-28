import { useNavigate } from "@solidjs/router";
import { createEffect, Show } from "solid-js";
import z from "zod";

import { ComparisonCard } from "../components/ComparisonCard";
import { ControlBand } from "../components/ControlBand";
import { useKeyboard } from "../hooks/useKeyboard";
import { useReviewAudio } from "../hooks/useReviewAudio";
import { trackSchema, type Track } from "../schemas/track";
import {
  reviewStore,
  setCurrentPair,
  setLoading,
  setError,
  recordComparison,
  updateSettings,
  toggleAutoplay,
  type TrackPair,
} from "../stores/reviewStore";

interface PairResponse {
  success: boolean;
  pairs?: Array<{
    trackA: Track;
    trackB: Track;
  }>;
  error?: string;
}

const pairsResponseSchema = z.object({
  success: z.boolean(),
  pairs: z
    .array(
      z.object({
        trackA: trackSchema,
        trackB: trackSchema,
      }),
    )
    .optional(),
  error: z.string().optional(),
});

interface ComparisonResponse {
  success: boolean;
  error?: string;
}

export const Review = () => {
  const navigate = useNavigate();

  const trackA = () => reviewStore.currentPair?.trackA ?? null;
  const trackB = () => reviewStore.currentPair?.trackB ?? null;
  const autoplay = () => reviewStore.settings.autoplay;

  const [audioState, audioControls] = useReviewAudio(trackA, trackB, autoplay);

  // Fetch a new pair from the API
  const fetchNewPair = async () => {
    setLoading(true);
    setError(null);

    try {
      const { settings } = reviewStore;
      const params = new URLSearchParams({
        strategy: settings.selectionStrategy,
        count: "1",
        ...(settings.filterOrder && { order: settings.filterOrder }),
        ...(settings.filterLimit && {
          limit: settings.filterLimit.toString(),
        }),
        uncertaintyWindow: settings.uncertaintyWindow.toString(),
      });

      const response = await fetch(`/api/pairs?${params}`);
      const data: PairResponse = pairsResponseSchema.parse(
        await response.json(),
      );

      if (data.success && data.pairs && data.pairs.length > 0) {
        const pair: TrackPair = {
          trackA: data.pairs[0].trackA,
          trackB: data.pairs[0].trackB,
        };
        setCurrentPair(pair);
      } else {
        setError(data.error || "No pairs available");
      }
    } catch (err) {
      console.error("Error fetching pair:", err);
      setError("Failed to fetch comparison pair");
    } finally {
      setLoading(false);
    }
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

      const data: ComparisonResponse = await response.json();

      if (!data.success) {
        console.error("Comparison submission failed:", data.error);
      }
    } catch (err) {
      console.error("Error submitting comparison:", err);
    }
  };

  // Handle selection of track A
  const handleSelectA = async () => {
    if (!reviewStore.currentPair) return;

    await submitComparison("win");
    recordComparison("win");
    await fetchNewPair();
  };

  // Handle selection of track B
  const handleSelectB = async () => {
    if (!reviewStore.currentPair) return;

    await submitComparison("loss");
    recordComparison("loss");
    await fetchNewPair();
  };

  // Handle draw
  const handleDraw = async () => {
    if (!reviewStore.currentPair) return;

    await submitComparison("draw");
    recordComparison("draw");
    await fetchNewPair();
  };

  // Handle skip
  const handleSkip = async () => {
    recordComparison("skip");
    await fetchNewPair();
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
  });

  return (
    <div class="review-container">
      <Show when={reviewStore.loading}>
        <div class="loading-overlay">
          <p>Loading comparison...</p>
        </div>
      </Show>

      <Show when={reviewStore.error}>
        <div class="error-banner" role="alert">
          <p>{reviewStore.error}</p>
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
