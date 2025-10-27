import { z } from "zod/v4";
import { asc, desc, sql } from "drizzle-orm";

import type { Db } from "../db";
import { scoredItems, itemsWithScore } from "../db/query";
import type { Ordering } from "./index";

const pairSelectionSchema = z.object({
  // Selection strategy
  strategy: z
    .enum(["random", "uncertain", "similar_scores"])
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

export type PairSelectionRequest = z.infer<typeof pairSelectionSchema>;

interface TrackPair {
  trackA: {
    id: number;
    title: string | null;
    artist: string | null;
    album: string | null;
    score: number | null;
  };
  trackB: {
    id: number;
    title: string | null;
    artist: string | null;
    album: string | null;
    score: number | null;
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

/**
 * Get a pool of tracks based on filters
 */
function getTrackPool(
  db: Db,
  orderString?: string,
  limitCount?: number,
): Array<{
  id: number;
  title: string | null;
  artist: string | null;
  album: string | null;
  score: number | null;
}> {
  const subquery = db.$with("items_with_score").as(itemsWithScore);
  let query = db
    .with(subquery)
    .select({
      id: scoredItems.id,
      title: scoredItems.title,
      artist: scoredItems.artist,
      album: scoredItems.album,
      score: scoredItems.score,
    })
    .from(scoredItems);

  // Apply ordering
  if (orderString) {
    const orderings = parseOrder(orderString);
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
function selectRandomPairs(
  tracks: Array<{ id: number; title: string | null; artist: string | null; album: string | null; score: number | null }>,
  count: number,
): TrackPair[] {
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
      },
      trackB: {
        id: trackB.id,
        title: trackB.title,
        artist: trackB.artist,
        album: trackB.album,
        score: trackB.score,
      },
    });
  }

  return pairs;
}

/**
 * Select pairs with similar scores (high uncertainty)
 */
function selectUncertainPairs(
  tracks: Array<{ id: number; title: string | null; artist: string | null; album: string | null; score: number | null }>,
  count: number,
  uncertaintyWindow: number,
): TrackPair[] {
  const pairs: TrackPair[] = [];

  // Sort by score
  const sorted = [...tracks].sort((a, b) => {
    const scoreA = a.score ?? 1500;
    const scoreB = b.score ?? 1500;
    return scoreA - scoreB;
  });

  // Find pairs with similar scores
  const usedIndices = new Set<number>();

  for (let i = 0; i < sorted.length && pairs.length < count; i++) {
    if (usedIndices.has(i)) continue;

    const trackA = sorted[i];
    const scoreA = trackA.score ?? 1500;

    // Find a track with similar score
    for (let j = i + 1; j < sorted.length; j++) {
      if (usedIndices.has(j)) continue;

      const trackB = sorted[j];
      const scoreB = trackB.score ?? 1500;

      if (Math.abs(scoreA - scoreB) <= uncertaintyWindow) {
        pairs.push({
          trackA: {
            id: trackA.id,
            title: trackA.title,
            artist: trackA.artist,
            album: trackA.album,
            score: trackA.score,
          },
          trackB: {
            id: trackB.id,
            title: trackB.title,
            artist: trackB.artist,
            album: trackB.album,
            score: trackB.score,
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
 * Handle pair selection request
 */
export async function getPairs(db: Db, req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const params = {
      strategy:
        (url.searchParams.get("strategy") as PairSelectionRequest["strategy"]) ||
        "random",
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
