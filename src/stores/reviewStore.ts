import { createStore } from "solid-js/store";
import { z } from "zod";

import type { Json } from "../../server/api/task";

export type ComparisonResult = "win" | "loss" | "draw" | "skip";

export type SelectionStrategy = "random" | "uncertain" | "similar_scores" | "high_uncertainty" | "mixed_uncertainty" | "high_score_rest";

export const trackSubset = z.object({
  id: z.number(),
  title: z.string().nullable(),
  artist: z.string().nullable(),
  album: z.string().nullable(),
  score: z.number().nullable(),
  artwork: z.string().nullable().optional(),
});

export type TrackSubset = z.infer<typeof trackSubset>;

export interface TrackPair {
  trackA: TrackSubset;
  trackB: TrackSubset;
}

export interface SessionStats {
  comparisonsCompleted: number;
  wins: number;
  losses: number;
  draws: number;
  skips: number;
}

export interface ReviewSettings {
  autoplay: boolean;
  kFactor: number;
  selectionStrategy: SelectionStrategy;
  uncertaintyWindow: number;
  filterOrder?: string;
  filterLimit?: number;
}

export interface ReviewState {
  // Current comparison
  currentPair: TrackPair | null;
  loading: boolean;
  error: Json | null;

  // Session tracking
  stats: SessionStats;

  // Settings
  settings: ReviewSettings;

  // Playback state
  playback: {
    currentTrack: "A" | "B" | null;
    isPlaying: boolean;
  };
}

const initialStats: SessionStats = {
  comparisonsCompleted: 0,
  wins: 0,
  losses: 0,
  draws: 0,
  skips: 0,
};

const defaultSettings: ReviewSettings = {
  autoplay: false,
  kFactor: 32,
  selectionStrategy: "random",
  uncertaintyWindow: 200,
};

const initialState: ReviewState = {
  currentPair: null,
  loading: false,
  error: null,
  stats: initialStats,
  settings: defaultSettings,
  playback: {
    currentTrack: null,
    isPlaying: false,
  },
};

export const [reviewStore, setReviewStore] =
  createStore<ReviewState>(initialState);

// Helper functions to update the store

export const setCurrentPair = (pair: TrackPair | null) => {
  setReviewStore("currentPair", pair);
};

export const setLoading = (loading: boolean) => {
  setReviewStore("loading", loading);
};

export const setError = (error: Json) => {
  setReviewStore("error", error);
};

export const recordComparison = (result: ComparisonResult) => {
  setReviewStore("stats", "comparisonsCompleted", (count) => count + 1);

  switch (result) {
    case "win":
      setReviewStore("stats", "wins", (count) => count + 1);
      break;
    case "loss":
      setReviewStore("stats", "losses", (count) => count + 1);
      break;
    case "draw":
      setReviewStore("stats", "draws", (count) => count + 1);
      break;
    case "skip":
      setReviewStore("stats", "skips", (count) => count + 1);
      break;
  }
};

export const resetStats = () => {
  setReviewStore("stats", initialStats);
};

export const updateSettings = (settings: Partial<ReviewSettings>) => {
  setReviewStore("settings", settings);
};

export const setPlaybackState = (
  track: "A" | "B" | null,
  isPlaying: boolean,
) => {
  setReviewStore("playback", {
    currentTrack: track,
    isPlaying,
  });
};

export const toggleAutoplay = () => {
  setReviewStore("settings", "autoplay", (current) => !current);
};
