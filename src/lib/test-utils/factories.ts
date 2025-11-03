/**
 * Generic props factory helper for tests
 * Reduces boilerplate by combining default values with test-specific overrides
 */

/**
 * Creates a factory function that generates test props with defaults
 * @param defaults - Default prop values
 * @returns Factory function that merges defaults with overrides
 */
export function createPropsFactory<T extends object>(defaults: T) {
  return (overrides?: Partial<T>): T => ({
    ...defaults,
    ...overrides,
  });
}

/**
 * Specialized factory for creating mock score info objects
 */
export function createScoreInfoFactory() {
  return createPropsFactory({
    side: "A" as const,
    oldRating: 1500,
    newRating: 1520,
    change: 20,
    rd: 30,
    volatility: 0.08,
    conservativeRating: 1490,
    confidence: 0.75,
  });
}
