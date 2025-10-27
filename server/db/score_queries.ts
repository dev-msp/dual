import { eq, and } from "drizzle-orm";

import type { Db } from "./index";
import { itemAttributes } from "./schema";
import { DEFAULT_RATING } from "../utils/elo";

/**
 * Get the current score for a track
 * Returns DEFAULT_RATING if no score exists
 */
export function getTrackScore(db: Db, trackId: number): number {
  const result = db
    .select({ value: itemAttributes.value })
    .from(itemAttributes)
    .where(
      and(
        eq(itemAttributes.entity_id, trackId),
        eq(itemAttributes.key, "score"),
      ),
    )
    .get();

  if (!result?.value) {
    return DEFAULT_RATING;
  }

  const score = parseFloat(result.value);
  return isNaN(score) ? DEFAULT_RATING : score;
}

/**
 * Update or insert a track's score
 */
export function setTrackScore(db: Db, trackId: number, score: number): void {
  const existing = db
    .select({ id: itemAttributes.id })
    .from(itemAttributes)
    .where(
      and(
        eq(itemAttributes.entity_id, trackId),
        eq(itemAttributes.key, "score"),
      ),
    )
    .get();

  const scoreStr = score.toFixed(2);

  if (existing) {
    // Update existing score
    db.update(itemAttributes)
      .set({ value: scoreStr })
      .where(eq(itemAttributes.id, existing.id))
      .run();
  } else {
    // Insert new score
    db.insert(itemAttributes)
      .values({
        entity_id: trackId,
        key: "score",
        value: scoreStr,
      })
      .run();
  }
}

/**
 * Get scores for multiple tracks at once
 */
export function getTrackScores(
  db: Db,
  trackIds: number[],
): Record<number, number> {
  if (trackIds.length === 0) {
    return {};
  }

  const results = db
    .select({
      entityId: itemAttributes.entity_id,
      value: itemAttributes.value,
    })
    .from(itemAttributes)
    .where(eq(itemAttributes.key, "score"))
    .all();

  const scores: Record<number, number> = {};

  // Initialize all tracks with default rating
  for (const trackId of trackIds) {
    scores[trackId] = DEFAULT_RATING;
  }

  // Update with actual scores
  for (const result of results) {
    if (result.entityId && trackIds.includes(result.entityId)) {
      const score = parseFloat(result.value || "");
      if (!isNaN(score)) {
        scores[result.entityId] = score;
      }
    }
  }

  return scores;
}
