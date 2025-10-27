/**
 * ELO rating calculation utilities for track comparison
 */

export type ComparisonResult = "win" | "loss" | "draw";

export interface EloRatings {
  trackA: number;
  trackB: number;
}

export interface EloUpdate {
  newRatingA: number;
  newRatingB: number;
  changeA: number;
  changeB: number;
}

/**
 * The K-factor determines how much ratings change after each game
 * Higher K = more volatile ratings, faster convergence
 * Lower K = more stable ratings, slower convergence
 * Common values: 16-32 for established players, 40 for newcomers
 */
export const DEFAULT_K_FACTOR = 32;

/**
 * Default rating for new tracks with no comparisons yet
 */
export const DEFAULT_RATING = 1500;

/**
 * Calculate expected score for a player given two ratings
 * Returns a value between 0 and 1 representing win probability
 *
 * @param ratingA - Current rating of player A
 * @param ratingB - Current rating of player B
 * @returns Expected score for player A (0-1)
 */
export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

/**
 * Calculate new ELO ratings after a comparison
 *
 * @param ratings - Current ratings for both tracks
 * @param result - Result from track A's perspective ("win", "loss", or "draw")
 * @param kFactor - K-factor for rating volatility (default: 32)
 * @returns New ratings and changes for both tracks
 */
export function calculateEloUpdate(
  ratings: EloRatings,
  result: ComparisonResult,
  kFactor: number = DEFAULT_K_FACTOR,
): EloUpdate {
  const { trackA, trackB } = ratings;

  // Calculate expected scores
  const expectedA = expectedScore(trackA, trackB);
  const expectedB = expectedScore(trackB, trackA);

  // Convert result to actual scores
  let actualScoreA: number;
  let actualScoreB: number;

  switch (result) {
    case "win":
      actualScoreA = 1;
      actualScoreB = 0;
      break;
    case "loss":
      actualScoreA = 0;
      actualScoreB = 1;
      break;
    case "draw":
      actualScoreA = 0.5;
      actualScoreB = 0.5;
      break;
  }

  // Calculate rating changes
  const changeA = kFactor * (actualScoreA - expectedA);
  const changeB = kFactor * (actualScoreB - expectedB);

  return {
    newRatingA: trackA + changeA,
    newRatingB: trackB + changeB,
    changeA,
    changeB,
  };
}

/**
 * Get the result from track B's perspective given track A's result
 */
export function invertResult(result: ComparisonResult): ComparisonResult {
  switch (result) {
    case "win":
      return "loss";
    case "loss":
      return "win";
    case "draw":
      return "draw";
  }
}
