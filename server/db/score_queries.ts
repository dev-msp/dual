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
 * Also updates the last_rated_at timestamp
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

  // Update the last rated timestamp
  const currentTimestamp = Math.floor(Date.now() / 1000);
  setTrackLastRatedAt(db, trackId, currentTimestamp);
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

/**
 * Get the last rated timestamp for a track
 * Returns null if no timestamp exists
 */
export function getTrackLastRatedAt(db: Db, trackId: number): number | null {
  const result = db
    .select({ value: itemAttributes.value })
    .from(itemAttributes)
    .where(
      and(
        eq(itemAttributes.entity_id, trackId),
        eq(itemAttributes.key, "last_rated_at"),
      ),
    )
    .get();

  if (!result?.value) {
    return null;
  }

  const timestamp = parseInt(result.value, 10);
  return isNaN(timestamp) ? null : timestamp;
}

/**
 * Update or insert a track's last rated timestamp
 */
export function setTrackLastRatedAt(db: Db, trackId: number, timestamp: number): void {
  const existing = db
    .select({ id: itemAttributes.id })
    .from(itemAttributes)
    .where(
      and(
        eq(itemAttributes.entity_id, trackId),
        eq(itemAttributes.key, "last_rated_at"),
      ),
    )
    .get();

  const timestampStr = timestamp.toString();

  if (existing) {
    // Update existing timestamp
    db.update(itemAttributes)
      .set({ value: timestampStr })
      .where(eq(itemAttributes.id, existing.id))
      .run();
  } else {
    // Insert new timestamp
    db.insert(itemAttributes)
      .values({
        entity_id: trackId,
        key: "last_rated_at",
        value: timestampStr,
      })
      .run();
  }
}
