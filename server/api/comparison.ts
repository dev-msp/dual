import { z } from "zod/v4";

import type { Db } from "../db";
import { getTrackRatings, setTrackRating } from "../db/score_queries";
import {
  calculateGlicko2Update,
  conservativeRating,
  getConfidenceLevel,
  type ComparisonResult,
} from "../utils/glicko2";

const comparisonSubmissionSchema = z.object({
  trackAId: z.number().positive(),
  trackBId: z.number().positive(),
  result: z.enum(["win", "loss", "draw"]),
  // kFactor is no longer used in Glicko-2, but keep for backwards compatibility
  kFactor: z.number().positive().optional(),
});

export type ComparisonSubmission = z.infer<typeof comparisonSubmissionSchema>;

/**
 * Handle a comparison submission request
 * Calculates new Glicko-2 ratings and updates the database
 */
export async function submitComparison(
  db: Db,
  req: Request,
): Promise<Response> {
  try {
    // Parse request body
    const body = await req.json();
    const submission = comparisonSubmissionSchema.parse(body);

    const { trackAId, trackBId, result } = submission;

    // Fetch current Glicko-2 ratings
    const ratings = getTrackRatings(db, [trackAId, trackBId]);
    const currentRatingA = ratings[trackAId];
    const currentRatingB = ratings[trackBId];

    // Calculate new ratings using Glicko-2
    const update = calculateGlicko2Update(
      currentRatingA,
      currentRatingB,
      result as ComparisonResult,
    );

    // Update ratings in database
    setTrackRating(db, trackAId, update.newRatingA);
    setTrackRating(db, trackBId, update.newRatingB);

    // Return the update details with Glicko-2 information
    return new Response(
      JSON.stringify({
        success: true,
        trackA: {
          id: trackAId,
          oldRating: currentRatingA.rating,
          newRating: update.newRatingA.rating,
          change: update.changeA,
          rd: update.newRatingA.rd,
          volatility: update.newRatingA.volatility,
          conservativeRating: conservativeRating(update.newRatingA),
          confidence: getConfidenceLevel(update.newRatingA),
        },
        trackB: {
          id: trackBId,
          oldRating: currentRatingB.rating,
          newRating: update.newRatingB.rating,
          change: update.changeB,
          rd: update.newRatingB.rd,
          volatility: update.newRatingB.volatility,
          conservativeRating: conservativeRating(update.newRatingB),
          confidence: getConfidenceLevel(update.newRatingB),
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error submitting comparison:", error);

    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid request format",
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
