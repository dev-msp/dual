/**
 * Mock factory utilities for test setup
 * Reduces boilerplate when creating multiple mock functions
 */

import { vi, type MockedFunction } from "vitest";

/**
 * Create mock functions for an array of action names
 * @param actions - Array of action names
 * @returns Object mapping action names to vi.fn() mocks
 */
export function createHandlerMocks(
  actions: string[]
): Record<string, MockedFunction<any>> {
  return Object.fromEntries(actions.map((action) => [action, vi.fn()]));
}

/**
 * Create callback mocks with optional initial values
 */
export function createCallbackMocks(callbackNames: {
  [key: string]: any;
}): Record<string, MockedFunction<any>> {
  return Object.fromEntries(
    Object.entries(callbackNames).map(([name]) => [name, vi.fn()])
  );
}

/**
 * Verify a mock was called and get its call arguments
 */
export function getCallArgs(
  mock: MockedFunction<any>,
  callIndex: number = 0
): any[] {
  if (!mock.mock.calls[callIndex]) {
    throw new Error(
      `Mock was not called enough times. Expected call at index ${callIndex}, but only has ${mock.mock.calls.length} calls`
    );
  }
  return mock.mock.calls[callIndex];
}

/**
 * Verify a mock was called with specific argument at index
 */
export function expectCallArg(
  mock: MockedFunction<any>,
  argIndex: number,
  expectedValue: any,
  callIndex: number = 0
): void {
  const args = getCallArgs(mock, callIndex);
  if (args[argIndex] !== expectedValue) {
    throw new Error(
      `Expected argument at index ${argIndex} to be ${expectedValue}, got ${args[argIndex]}`
    );
  }
}
