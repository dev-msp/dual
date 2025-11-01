import { eq, and } from "drizzle-orm";

import type { Db } from "./index";
import { itemAttributes } from "./schema";
import {
  DEFAULT_RATING,
  DEFAULT_RD,
  DEFAULT_VOLATILITY,
  type GlickoRating,
} from "../utils/glicko2";

/**
 * Get the current Glicko-2 rating for a track
 * Returns default values if no rating exists
 */
export function getTrackRating(db: Db, trackId: number): GlickoRating {
  const results = db
    .select({ key: itemAttributes.key, value: itemAttributes.value })
    .from(itemAttributes)
    .where(eq(itemAttributes.entity_id, trackId))
    .all();

  const attributes: Record<string, string> = {};
  for (const row of results) {
    if (row.key) {
      attributes[row.key] = row.value || "";
    }
  }

  const rating = parseFloat(attributes["rating"] || attributes["score"] || "");
  const rd = parseFloat(attributes["rd"] || "");
  const volatility = parseFloat(attributes["volatility"] || "");

  return {
    rating: isNaN(rating) ? DEFAULT_RATING : rating,
    rd: isNaN(rd) ? DEFAULT_RD : rd,
    volatility: isNaN(volatility) ? DEFAULT_VOLATILITY : volatility,
  };
}

/**
 * Get the current score for a track (backwards compatibility)
 * Returns DEFAULT_RATING if no score exists
 */
export function getTrackScore(db: Db, trackId: number): number {
  return getTrackRating(db, trackId).rating;
}

/**
 * Update or insert a track's Glicko-2 rating
 * Also updates the last_rated_at timestamp
 */
export function setTrackRating(db: Db, trackId: number, rating: GlickoRating): void {
  // Helper to update or insert a single attribute
  const upsertAttribute = (key: string, value: string) => {
    const existing = db
      .select({ id: itemAttributes.id })
      .from(itemAttributes)
      .where(
        and(
          eq(itemAttributes.entity_id, trackId),
          eq(itemAttributes.key, key),
        ),
      )
      .get();

    if (existing) {
      db.update(itemAttributes)
        .set({ value })
        .where(eq(itemAttributes.id, existing.id))
        .run();
    } else {
      db.insert(itemAttributes)
        .values({
          entity_id: trackId,
          key,
          value,
        })
        .run();
    }
  };

  // Store all three components of the Glicko-2 rating
  upsertAttribute("rating", rating.rating.toFixed(2));
  upsertAttribute("rd", rating.rd.toFixed(2));
  upsertAttribute("volatility", rating.volatility.toFixed(6));

  // Keep "score" key for backwards compatibility
  upsertAttribute("score", rating.rating.toFixed(2));

  // Update the last rated timestamp
  const currentTimestamp = Math.floor(Date.now() / 1000);
  setTrackLastRatedAt(db, trackId, currentTimestamp);
}

/**
 * Update or insert a track's score (backwards compatibility)
 * Also updates the last_rated_at timestamp
 */
export function setTrackScore(db: Db, trackId: number, score: number): void {
  const currentRating = getTrackRating(db, trackId);
  setTrackRating(db, trackId, {
    ...currentRating,
    rating: score,
  });
}

/**
 * Get Glicko-2 ratings for multiple tracks at once
 */
export function getTrackRatings(
  db: Db,
  trackIds: number[],
): Record<number, GlickoRating> {
  if (trackIds.length === 0) {
    return {};
  }

  const results = db
    .select({
      entityId: itemAttributes.entity_id,
      key: itemAttributes.key,
      value: itemAttributes.value,
    })
    .from(itemAttributes)
    .all();

  // Group by track ID
  const trackData: Record<number, Record<string, string>> = {};
  for (const trackId of trackIds) {
    trackData[trackId] = {};
  }

  for (const result of results) {
    if (result.entityId && trackIds.includes(result.entityId) && result.key) {
      trackData[result.entityId][result.key] = result.value || "";
    }
  }

  // Convert to GlickoRating objects
  const ratings: Record<number, GlickoRating> = {};
  for (const trackId of trackIds) {
    const data = trackData[trackId];
    const rating = parseFloat(data["rating"] || data["score"] || "");
    const rd = parseFloat(data["rd"] || "");
    const volatility = parseFloat(data["volatility"] || "");

    ratings[trackId] = {
      rating: isNaN(rating) ? DEFAULT_RATING : rating,
      rd: isNaN(rd) ? DEFAULT_RD : rd,
      volatility: isNaN(volatility) ? DEFAULT_VOLATILITY : volatility,
    };
  }

  return ratings;
}

/**
 * Get scores for multiple tracks at once (backwards compatibility)
 */
export function getTrackScores(
  db: Db,
  trackIds: number[],
): Record<number, number> {
  const ratings = getTrackRatings(db, trackIds);
  const scores: Record<number, number> = {};
  for (const [trackId, rating] of Object.entries(ratings)) {
    scores[Number(trackId)] = rating.rating;
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
