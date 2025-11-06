/**
 * Shared test setup utilities
 * Reduces repetitive beforeEach/afterEach boilerplate
 */

import { cleanup } from "@solidjs/testing-library";
import { beforeEach, afterEach, vi } from "vitest";

/**
 * Setup fake timers for all tests in a describe block
 * Automatically handles cleanup
 */
export function setupFakeTimers(): void {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });
}

/**
 * Setup standard cleanup for all tests in a describe block
 */
export function setupCleanup(): void {
  afterEach(() => {
    cleanup();
  });
}

/**
 * Setup both fake timers and cleanup
 */
export function setupTestEnvironment(): void {
  setupFakeTimers();
}

/**
 * Setup mock clearing between tests
 */
export function setupMockClearing(): void {
  afterEach(() => {
    vi.clearAllMocks();
  });
}
