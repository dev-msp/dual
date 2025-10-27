import { z } from "zod/v4";

import type { Db } from "../db";
import { getTrackScores, setTrackScore } from "../db/score_queries";
import {
  calculateEloUpdate,
  type ComparisonResult,
  DEFAULT_K_FACTOR,
} from "../utils/elo";

const comparisonSubmissionSchema = z.object({
  trackAId: z.number().positive(),
  trackBId: z.number().positive(),
  result: z.enum(["win", "loss", "draw"]),
  kFactor: z.number().positive().optional().default(DEFAULT_K_FACTOR),
});

export type ComparisonSubmission = z.infer<typeof comparisonSubmissionSchema>;

/**
 * Handle a comparison submission request
 * Calculates new ELO ratings and updates the database
 */
export async function submitComparison(
  db: Db,
  req: Request,
): Promise<Response> {
  try {
    // Parse request body
    const body = await req.json();
    const submission = comparisonSubmissionSchema.parse(body);

    const { trackAId, trackBId, result, kFactor } = submission;

    // Fetch current scores
    const scores = getTrackScores(db, [trackAId, trackBId]);
    const currentRatingA = scores[trackAId];
    const currentRatingB = scores[trackBId];

    // Calculate new ratings
    const update = calculateEloUpdate(
      {
        trackA: currentRatingA,
        trackB: currentRatingB,
      },
      result as ComparisonResult,
      kFactor,
    );

    // Update scores in database
    setTrackScore(db, trackAId, update.newRatingA);
    setTrackScore(db, trackBId, update.newRatingB);

    // Return the update details
    return new Response(
      JSON.stringify({
        success: true,
        trackA: {
          id: trackAId,
          oldRating: currentRatingA,
          newRating: update.newRatingA,
          change: update.changeA,
        },
        trackB: {
          id: trackBId,
          oldRating: currentRatingB,
          newRating: update.newRatingB,
          change: update.changeB,
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
