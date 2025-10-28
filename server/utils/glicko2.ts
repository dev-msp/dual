/**
 * Glicko-2 rating system implementation
 *
 * Based on Mark Glickman's Glicko-2 system:
 * http://www.glicko.net/glicko/glicko2.pdf
 *
 * Key concepts:
 * - rating (r): The skill estimate (starts at 1500)
 * - rating deviation (RD): Uncertainty about the rating (starts at 350)
 * - volatility (σ): Consistency of performance (starts at 0.06)
 *
 * Conservative ranking uses: r - 3*RD (99.7% confidence lower bound)
 */

export type ComparisonResult = "win" | "loss" | "draw";

export interface GlickoRating {
  rating: number;      // r: The rating (e.g., 1500)
  rd: number;          // RD: Rating deviation (uncertainty, e.g., 350)
  volatility: number;  // σ: Volatility (consistency, e.g., 0.06)
}

export interface GlickoUpdate {
  newRatingA: GlickoRating;
  newRatingB: GlickoRating;
  changeA: number;
  changeB: number;
}

// System constants
export const DEFAULT_RATING = 1500;
export const DEFAULT_RD = 350;        // High uncertainty for new tracks
export const DEFAULT_VOLATILITY = 0.06;
export const GLICKO2_SCALE = 173.7178;  // Converts Glicko-1 scale to Glicko-2
export const TAU = 0.5;                 // System constant (constrains volatility changes)
export const CONVERGENCE_TOLERANCE = 0.000001;

/**
 * Convert Glicko-1 rating to Glicko-2 scale (μ)
 */
function toGlicko2Rating(rating: number): number {
  return (rating - DEFAULT_RATING) / GLICKO2_SCALE;
}

/**
 * Convert Glicko-1 RD to Glicko-2 scale (φ)
 */
function toGlicko2RD(rd: number): number {
  return rd / GLICKO2_SCALE;
}

/**
 * Convert Glicko-2 rating back to Glicko-1 scale
 */
function toGlicko1Rating(mu: number): number {
  return mu * GLICKO2_SCALE + DEFAULT_RATING;
}

/**
 * Convert Glicko-2 RD back to Glicko-1 scale
 */
function toGlicko1RD(phi: number): number {
  return phi * GLICKO2_SCALE;
}

/**
 * Calculate g(φ) - reduces impact of high RD opponents
 */
function g(phi: number): number {
  return 1 / Math.sqrt(1 + (3 * phi * phi) / (Math.PI * Math.PI));
}

/**
 * Calculate E(μ, μj, φj) - expected score
 */
function E(mu: number, muJ: number, phiJ: number): number {
  return 1 / (1 + Math.exp(-g(phiJ) * (mu - muJ)));
}

/**
 * Calculate variance (v)
 */
function calculateVariance(
  mu: number,
  opponents: Array<{ mu: number; phi: number }>,
): number {
  let sum = 0;
  for (const opp of opponents) {
    const gPhi = g(opp.phi);
    const e = E(mu, opp.mu, opp.phi);
    sum += gPhi * gPhi * e * (1 - e);
  }
  return 1 / sum;
}

/**
 * Calculate delta (Δ) - improvement in rating
 */
function calculateDelta(
  v: number,
  mu: number,
  opponents: Array<{ mu: number; phi: number; score: number }>,
): number {
  let sum = 0;
  for (const opp of opponents) {
    const gPhi = g(opp.phi);
    const e = E(mu, opp.mu, opp.phi);
    sum += gPhi * (opp.score - e);
  }
  return v * sum;
}

/**
 * Calculate new volatility (σ') - iterative algorithm
 */
function calculateNewVolatility(
  sigma: number,
  phi: number,
  v: number,
  delta: number,
): number {
  const phi2 = phi * phi;
  const delta2 = delta * delta;
  const tau2 = TAU * TAU;
  const a = Math.log(sigma * sigma);

  // Define the function f(x)
  const f = (x: number): number => {
    const ex = Math.exp(x);
    const phi2ex = phi2 + v + ex;
    const term1 = (ex * (delta2 - phi2 - v - ex)) / (2 * phi2ex * phi2ex);
    const term2 = (x - a) / tau2;
    return term1 - term2;
  };

  // Illinois algorithm to find x where f(x) = 0
  let A = a;
  let B: number;

  if (delta2 > phi2 + v) {
    B = Math.log(delta2 - phi2 - v);
  } else {
    let k = 1;
    while (f(a - k * TAU) < 0) {
      k++;
    }
    B = a - k * TAU;
  }

  let fA = f(A);
  let fB = f(B);

  // Iterate to convergence
  while (Math.abs(B - A) > CONVERGENCE_TOLERANCE) {
    const C = A + ((A - B) * fA) / (fB - fA);
    const fC = f(C);

    if (fC * fB <= 0) {
      A = B;
      fA = fB;
    } else {
      fA = fA / 2;
    }

    B = C;
    fB = fC;
  }

  return Math.exp(A / 2);
}

/**
 * Update a rating based on a single opponent
 */
function updateRating(
  rating: GlickoRating,
  opponentRating: GlickoRating,
  score: number, // 1 for win, 0.5 for draw, 0 for loss
): GlickoRating {
  // Convert to Glicko-2 scale
  const mu = toGlicko2Rating(rating.rating);
  const phi = toGlicko2RD(rating.rd);
  const sigma = rating.volatility;

  const muJ = toGlicko2Rating(opponentRating.rating);
  const phiJ = toGlicko2RD(opponentRating.rd);

  // Step 3: Calculate variance
  const v = calculateVariance(mu, [{ mu: muJ, phi: phiJ }]);

  // Step 4: Calculate delta
  const delta = calculateDelta(v, mu, [{ mu: muJ, phi: phiJ, score }]);

  // Step 5: Calculate new volatility
  const sigmaPrime = calculateNewVolatility(sigma, phi, v, delta);

  // Step 6: Calculate new phi*
  const phiStar = Math.sqrt(phi * phi + sigmaPrime * sigmaPrime);

  // Step 7: Calculate new phi and mu
  const phiPrime = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v);
  const muPrime = mu + phiPrime * phiPrime * g(phiJ) * (score - E(mu, muJ, phiJ));

  // Convert back to Glicko-1 scale
  return {
    rating: toGlicko1Rating(muPrime),
    rd: toGlicko1RD(phiPrime),
    volatility: sigmaPrime,
  };
}

/**
 * Calculate new Glicko-2 ratings after a comparison
 */
export function calculateGlicko2Update(
  ratingA: GlickoRating,
  ratingB: GlickoRating,
  result: ComparisonResult,
): GlickoUpdate {
  // Convert result to scores
  let scoreA: number;
  let scoreB: number;

  switch (result) {
    case "win":
      scoreA = 1;
      scoreB = 0;
      break;
    case "loss":
      scoreA = 0;
      scoreB = 1;
      break;
    case "draw":
      scoreA = 0.5;
      scoreB = 0.5;
      break;
  }

  // Update both ratings
  const newRatingA = updateRating(ratingA, ratingB, scoreA);
  const newRatingB = updateRating(ratingB, ratingA, scoreB);

  return {
    newRatingA,
    newRatingB,
    changeA: newRatingA.rating - ratingA.rating,
    changeB: newRatingB.rating - ratingB.rating,
  };
}

/**
 * Calculate conservative rating (μ - 3σ)
 * This gives a 99.7% confidence lower bound
 */
export function conservativeRating(rating: GlickoRating): number {
  return rating.rating - 3 * rating.rd;
}

/**
 * Calculate expected win probability
 */
export function expectedWinProbability(
  ratingA: GlickoRating,
  ratingB: GlickoRating,
): number {
  const muA = toGlicko2Rating(ratingA.rating);
  const muB = toGlicko2Rating(ratingB.rating);
  const phiB = toGlicko2RD(ratingB.rd);

  return E(muA, muB, phiB);
}

/**
 * Get confidence level (0-1) based on RD
 * Lower RD = higher confidence
 */
export function getConfidenceLevel(rating: GlickoRating): number {
  // Map RD from [50, 350] to confidence [1, 0]
  // RD of 50 = very confident (1.0)
  // RD of 350 = not confident (0.0)
  const minRD = 50;
  const maxRD = 350;
  const normalized = (rating.rd - minRD) / (maxRD - minRD);
  return Math.max(0, Math.min(1, 1 - normalized));
}

/**
 * Increase RD due to inactivity (rating decay)
 * Call this periodically for tracks that haven't been compared recently
 */
export function applyRatingDecay(
  rating: GlickoRating,
  ratingPeriods: number = 1, // Number of periods of inactivity
): GlickoRating {
  const phi = toGlicko2RD(rating.rd);
  const sigma = rating.volatility;

  // Pre-rating period step: increase uncertainty
  const phiNew = Math.sqrt(phi * phi + ratingPeriods * sigma * sigma);

  return {
    ...rating,
    rd: toGlicko1RD(phiNew),
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
