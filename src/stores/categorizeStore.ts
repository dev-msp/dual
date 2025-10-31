import { createStore } from "solid-js/store";
import { z } from "zod";

import type { Json } from "../../server/api/task";

export const trackSubset = z.object({
  id: z.number(),
  title: z.string().nullable(),
  artist: z.string().nullable(),
  album: z.string().nullable(),
  album_id: z.number().nullable().optional(),
  albumHash: z.string().nullable().optional(),
  artPath: z.string().nullable().optional(),
});

export type TrackSubset = z.infer<typeof trackSubset>;

export interface CategorizationStats {
  categorized: number;
  remaining: number;
}

export interface CategorizeState {
  // Available buckets from database
  availableBuckets: string[];

  // Active buckets for this session
  activeBuckets: string[];

  // Current track
  currentTrack: TrackSubset | null;

  // Bucket values for autocomplete
  bucketValues: Record<string, string[]>;

  // Current values being edited
  currentValues: Record<string, string>;

  // Session tracking
  stats: CategorizationStats;

  // Album mode toggle (persists across tracks)
  albumMode: boolean;

  // Album track count for current album
  albumTrackCount: number | null;

  // Loading and error states
  loading: boolean;
  error: Json | null;
}

const initialStats: CategorizationStats = {
  categorized: 0,
  remaining: 0,
};

const initialState: CategorizeState = {
  availableBuckets: [],
  activeBuckets: [],
  currentTrack: null,
  bucketValues: {},
  currentValues: {},
  stats: initialStats,
  albumMode: false,
  albumTrackCount: null,
  loading: false,
  error: null,
};

export const [categorizeStore, setCategorizeStore] =
  createStore<CategorizeState>(initialState);

// Helper functions to update the store

export const setAvailableBuckets = (buckets: string[]) => {
  setCategorizeStore("availableBuckets", buckets);
};

export const setActiveBuckets = (buckets: string[]) => {
  setCategorizeStore("activeBuckets", buckets);
};

export const setCurrentTrack = (track: TrackSubset | null) => {
  setCategorizeStore("currentTrack", track);
  if (track) {
    setCategorizeStore("currentValues", {});
  }
};

export const setBucketValues = (bucket: string, values: string[]) => {
  setCategorizeStore("bucketValues", bucket, values);
};

export const setCurrentValue = (bucket: string, value: string) => {
  setCategorizeStore("currentValues", bucket, value);
};

export const setStats = (stats: CategorizationStats) => {
  setCategorizeStore("stats", stats);
};

export const recordCategorization = () => {
  setCategorizeStore("stats", "categorized", (count) => count + 1);
  if (categorizeStore.stats.remaining > 0) {
    setCategorizeStore("stats", "remaining", (count) => count - 1);
  }
};

export const setLoading = (loading: boolean) => {
  setCategorizeStore("loading", loading);
};

export const setError = (error: Json | null) => {
  setCategorizeStore("error", error);
};

export const setAlbumMode = (enabled: boolean) => {
  setCategorizeStore("albumMode", enabled);
};

export const setAlbumTrackCount = (count: number | null) => {
  setCategorizeStore("albumTrackCount", count);
};

export const resetSession = () => {
  setCategorizeStore({
    availableBuckets: [],
    activeBuckets: [],
    currentTrack: null,
    bucketValues: {},
    currentValues: {},
    stats: initialStats,
    albumMode: false,
    albumTrackCount: null,
    loading: false,
    error: null,
  });
};
