import { asc, desc } from "drizzle-orm";
import { z } from "zod/v4";

import type { Db } from "../db";
import { scoredItems, itemsWithScore } from "../db/query";
import { DEFAULT_RATING, DEFAULT_RD } from "../utils/glicko2";

import type { Ordering } from "./index";

const pairSelectionSchema = z.object({
  // Selection strategy
  strategy: z
    .enum([
      "random",
      "uncertain",
      "similar_scores",
      "high_uncertainty",
      "mixed_uncertainty",
      "high_score_rest",
    ])
    .optional()
    .default("random"),

  // How many pairs to return
  count: z.number().positive().int().max(100).optional().default(1),

  // Filtering options (same as track list)
  order: z.array(z.string()).optional(),
  limit: z.number().positive().optional(),

  // For uncertain/similar_scores strategies
  uncertaintyWindow: z.number().positive().optional().default(200),
});

// High-Score Rest strategy parameters
const HIGH_SCORE_THRESHOLD = 1500;
const SETTLED_RD_THRESHOLD = 200;
const DECAY_CONSTANT = 8;

export type PairSelectionRequest = z.infer<typeof pairSelectionSchema>;

interface TrackPair {
  trackA: {
    id: number;
    title: string | null;
    artist: string | null;
    album: string | null;
    score: number | null;
    rd: number | null;
    volatility: number | null;
  };
  trackB: {
    id: number;
    title: string | null;
    artist: string | null;
    album: string | null;
    score: number | null;
    rd: number | null;
    volatility: number | null;
  };
}

/**
 * Parse order string (e.g., "score:desc,title:asc") into Ordering array
 */
function parseOrder(orderStr: string): Ordering[] {
  return orderStr.split(",").map((o) => {
    const [field, direction] = o.split(":");
    if (!["asc", "desc"].includes(direction)) {
      throw new Error(`Invalid order format: ${o}`);
    }
    return {
      field: field as Ordering["field"],
      direction: direction as "asc" | "desc",
    };
  });
}

type Track = {
  id: number;
  title: string | null;
  artist: string | null;
  album: string | null;
  score: number | null;
  rd: number | null;
  volatility: number | null;
  settled_at: number | null;
};

/**
 * Get a pool of tracks based on filters
 */
function getTrackPool(
  db: Db,
  orderArray?: string[],
  limitCount?: number,
): Track[] {
  const subquery = db.$with("items_with_score").as(itemsWithScore);
  let query = db
    .with(subquery)
    .select({
      id: scoredItems.id,
      title: scoredItems.title,
      artist: scoredItems.artist,
      album: scoredItems.album,
      score: scoredItems.score,
      rd: scoredItems.rd,
      volatility: scoredItems.volatility,
      settled_at: scoredItems.settled_at,
    })
    .from(scoredItems);

  // Apply ordering
  if (orderArray && orderArray.length > 0) {
    const orderings = orderArray.flatMap((orderStr) => parseOrder(orderStr));
    query = query.orderBy(
      ...orderings.map(({ field, direction }) =>
        direction === "desc"
          ? desc(scoredItems[field])
          : asc(scoredItems[field]),
      ),
    ) as typeof query;
  }

  // Apply limit
  if (limitCount) {
    query = query.limit(limitCount) as typeof query;
  }

  return query.all();
}

/**
 * Randomly select n pairs from the track pool
 */
function selectRandomPairs(tracks: Track[], count: number): TrackPair[] {
  const pairs: TrackPair[] = [];
  const shuffled = [...tracks].sort(() => Math.random() - 0.5);

  for (let i = 0; i < count && i * 2 + 1 < shuffled.length; i++) {
    const trackA = shuffled[i * 2];
    const trackB = shuffled[i * 2 + 1];

    pairs.push({
      trackA: {
        id: trackA.id,
        title: trackA.title,
        artist: trackA.artist,
        album: trackA.album,
        score: trackA.score,
        rd: trackA.rd,
        volatility: trackA.volatility,
      },
      trackB: {
        id: trackB.id,
        title: trackB.title,
        artist: trackB.artist,
        album: trackB.album,
        score: trackB.score,
        rd: trackB.rd,
        volatility: trackB.volatility,
      },
    });
  }

  return pairs;
}

/**
 * Select pairs with similar scores (high uncertainty)
 */
function selectUncertainPairs(
  tracks: Track[],
  count: number,
  uncertaintyWindow: number,
): TrackPair[] {
  const pairs: TrackPair[] = [];

  // Sort by score
  const sorted = [...tracks].sort((a, b) => {
    const scoreA = a.score ?? DEFAULT_RATING;
    const scoreB = b.score ?? DEFAULT_RATING;
    return scoreA - scoreB;
  });

  // Find pairs with similar scores
  const usedIndices = new Set<number>();

  for (let i = 0; i < sorted.length && pairs.length < count; i++) {
    if (usedIndices.has(i)) continue;

    const trackA = sorted[i];
    const scoreA = trackA.score ?? DEFAULT_RATING;

    // Find a track with similar score
    for (let j = i + 1; j < sorted.length; j++) {
      if (usedIndices.has(j)) continue;

      const trackB = sorted[j];
      const scoreB = trackB.score ?? DEFAULT_RATING;

      if (Math.abs(scoreA - scoreB) <= uncertaintyWindow) {
        pairs.push({
          trackA: {
            id: trackA.id,
            title: trackA.title,
            artist: trackA.artist,
            album: trackA.album,
            score: trackA.score,
            rd: trackA.rd,
            volatility: trackA.volatility,
          },
          trackB: {
            id: trackB.id,
            title: trackB.title,
            artist: trackB.artist,
            album: trackB.album,
            score: trackB.score,
            rd: trackB.rd,
            volatility: trackB.volatility,
          },
        });

        usedIndices.add(i);
        usedIndices.add(j);
        break;
      }
    }
  }

  // If we didn't find enough uncertain pairs, fill with random
  if (pairs.length < count) {
    const remaining = sorted.filter((_, idx) => !usedIndices.has(idx));
    const randomPairs = selectRandomPairs(remaining, count - pairs.length);
    pairs.push(...randomPairs);
  }

  return pairs;
}

/**
 * Select pairs prioritizing tracks with high RD (high uncertainty)
 * Pairs tracks with similar RD values
 */
function selectHighUncertaintyPairs(
  tracks: Track[],
  count: number,
): TrackPair[] {
  const pairs: TrackPair[] = [];

  // Sort by RD (descending) to prioritize uncertain tracks
  const sorted = [...tracks].sort((a, b) => {
    const rdA = a.rd ?? DEFAULT_RD;
    const rdB = b.rd ?? DEFAULT_RD;
    return rdB - rdA; // Higher RD first
  });

  // Match tracks with similar RD levels
  const usedIndices = new Set<number>();

  for (let i = 0; i < sorted.length && pairs.length < count; i++) {
    if (usedIndices.has(i)) continue;

    const trackA = sorted[i];
    const rdA = trackA.rd ?? DEFAULT_RD;

    // Find a track with similar RD (within 50 points)
    for (let j = i + 1; j < sorted.length; j++) {
      if (usedIndices.has(j)) continue;

      const trackB = sorted[j];
      const rdB = trackB.rd ?? DEFAULT_RD;

      if (Math.abs(rdA - rdB) <= 50) {
        pairs.push({
          trackA: {
            id: trackA.id,
            title: trackA.title,
            artist: trackA.artist,
            album: trackA.album,
            score: trackA.score,
            rd: trackA.rd,
            volatility: trackA.volatility,
          },
          trackB: {
            id: trackB.id,
            title: trackB.title,
            artist: trackB.artist,
            album: trackB.album,
            score: trackB.score,
            rd: trackB.rd,
            volatility: trackB.volatility,
          },
        });

        usedIndices.add(i);
        usedIndices.add(j);
        break;
      }
    }
  }

  // Fill remaining with random pairs from unused tracks
  if (pairs.length < count) {
    const remaining = sorted.filter((_, idx) => !usedIndices.has(idx));
    const randomPairs = selectRandomPairs(remaining, count - pairs.length);
    pairs.push(...randomPairs);
  }

  return pairs;
}

/**
 * Mixed uncertainty strategy: sometimes match similar uncertainties,
 * sometimes match high-RD with low-RD tracks for calibration
 */
function selectMixedUncertaintyPairs(
  tracks: Track[],
  count: number,
): TrackPair[] {
  const pairs: TrackPair[] = [];

  // Sort by RD
  const sorted = [...tracks].sort((a, b) => {
    const rdA = a.rd ?? DEFAULT_RD;
    const rdB = b.rd ?? DEFAULT_RD;
    return rdB - rdA; // Higher RD first
  });

  const usedIndices = new Set<number>();

  for (let i = 0; i < sorted.length && pairs.length < count; i++) {
    if (usedIndices.has(i)) continue;

    const trackA = sorted[i];
    const rdA = trackA.rd ?? DEFAULT_RD;

    // 50% chance: match similar RD, 50% chance: match different RD for calibration
    const matchSimilar = Math.random() < 0.5;

    let bestJ = -1;
    let bestDiff = Infinity;

    for (let j = i + 1; j < sorted.length; j++) {
      if (usedIndices.has(j)) continue;

      const trackB = sorted[j];
      const rdB = trackB.rd ?? DEFAULT_RD;
      const diff = Math.abs(rdA - rdB);

      if (matchSimilar) {
        // Find track with most similar RD
        if (diff < bestDiff) {
          bestDiff = diff;
          bestJ = j;
        }
      } else {
        // Find track with different RD (for calibration)
        if (diff > 100 && diff < bestDiff) {
          bestDiff = diff;
          bestJ = j;
        }
      }
    }

    if (bestJ !== -1) {
      const trackB = sorted[bestJ];
      pairs.push({
        trackA: {
          id: trackA.id,
          title: trackA.title,
          artist: trackA.artist,
          album: trackA.album,
          score: trackA.score,
          rd: trackA.rd,
          volatility: trackA.volatility,
        },
        trackB: {
          id: trackB.id,
          title: trackB.title,
          artist: trackB.artist,
          album: trackB.album,
          score: trackB.score,
          rd: trackB.rd,
          volatility: trackB.volatility,
        },
      });

      usedIndices.add(i);
      usedIndices.add(bestJ);
    }
  }

  // Fill remaining with random pairs
  if (pairs.length < count) {
    const remaining = sorted.filter((_, idx) => !usedIndices.has(idx));
    const randomPairs = selectRandomPairs(remaining, count - pairs.length);
    pairs.push(...randomPairs);
  }

  return pairs;
}

/**
 * High-Score Rest strategy: interrogate high-scoring tracks while uncertain,
 * exclude settled ones with decay window. Returns empty if not enough uncertain high-score tracks.
 */
function selectHighScoreRestPairs(
  tracks: Track[],
  count: number,
  minExclusionDays: number = 7,
): TrackPair[] {
  // Filter to high-score pool
  const highScoreTracks = tracks.filter(
    (t) => (t.score ?? DEFAULT_RATING) >= HIGH_SCORE_THRESHOLD,
  );

  if (highScoreTracks.length < 2) {
    // Not enough high-score tracks to form pairs
    return [];
  }

  const now = Math.floor(Date.now() / 1000); // Unix timestamp in seconds

  // Split into uncertain (eligible) and settled (excluded based on decay)
  const uncertainTracks = highScoreTracks.filter((t) => {
    const rd = t.rd ?? DEFAULT_RD;

    // Still high-uncertainty: always eligible
    if (rd >= SETTLED_RD_THRESHOLD) {
      return true;
    }

    // Settled: check if decay window has elapsed
    if (t.settled_at === null || t.settled_at === undefined) {
      // Never settled: eligible to become settled
      return true;
    }

    const daysSinceSettled = (now - t.settled_at) / (60 * 60 * 24);
    const decayDays =
      (minExclusionDays * Math.log(daysSinceSettled + 1)) /
      Math.log(DECAY_CONSTANT);

    // Re-eligible if decay window has passed
    return daysSinceSettled >= decayDays;
  });

  if (uncertainTracks.length < 2) {
    // Not enough uncertain high-score tracks to form pairs
    return [];
  }

  // Form pairs from uncertain pool
  return selectRandomPairs(uncertainTracks, count);
}

/**
 * Handle pair selection request
 */
export function getPairs(db: Db, req: Request): Response {
  try {
    const url = new URL(req.url);
    const params = {
      strategy:
        (url.searchParams.get(
          "strategy",
        ) as PairSelectionRequest["strategy"]) || "random",
      count: url.searchParams.get("count")
        ? parseInt(url.searchParams.get("count")!, 10)
        : 1,
      order: url.searchParams.get("order") || undefined,
      limit: url.searchParams.get("limit")
        ? parseInt(url.searchParams.get("limit")!, 10)
        : undefined,
      uncertaintyWindow: url.searchParams.get("uncertaintyWindow")
        ? parseInt(url.searchParams.get("uncertaintyWindow")!, 10)
        : 200,
    };

    const request = pairSelectionSchema.parse(params);

    // Get track pool
    const tracks = getTrackPool(db, request.order, request.limit);

    if (tracks.length < 2) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Not enough tracks to form pairs",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Select pairs based on strategy
    let pairs: TrackPair[];
    switch (request.strategy) {
      case "uncertain":
      case "similar_scores":
        pairs = selectUncertainPairs(
          tracks,
          request.count,
          request.uncertaintyWindow,
        );
        break;
      case "high_uncertainty":
        pairs = selectHighUncertaintyPairs(tracks, request.count);
        break;
      case "mixed_uncertainty":
        pairs = selectMixedUncertaintyPairs(tracks, request.count);
        break;
      case "high_score_rest":
        pairs = selectHighScoreRestPairs(tracks, request.count);
        break;
      case "random":
      default:
        pairs = selectRandomPairs(tracks, request.count);
        break;
    }

    return new Response(
      JSON.stringify({
        success: true,
        pairs,
        strategy: request.strategy,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error getting pairs:", error);

    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid request parameters",
          details: error.issues,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: "Internal server error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
