import { describe, it, expect } from "vitest";

import type {
  NormalizedKeyboardEvent,
  KeyboardAction,
  ActionBinding,
} from "./index";

describe("Type structures", () => {
  describe("ActionBinding", () => {
    it("should have required action property", () => {
      const binding: ActionBinding = {
        action: "TEST_ACTION",
      };

      expect(binding.action).toBe("TEST_ACTION");
    });

    it("should support optional context property", () => {
      const binding: ActionBinding = {
        action: "TEST_ACTION",
        context: "review",
      };

      expect(binding.action).toBe("TEST_ACTION");
      expect(binding.context).toBe("review");
    });

    it("should support optional preventDefault property", () => {
      const binding: ActionBinding = {
        action: "TEST_ACTION",
        preventDefault: true,
      };

      expect(binding.action).toBe("TEST_ACTION");
      expect(binding.preventDefault).toBe(true);
    });

    it("should support all optional properties together", () => {
      const binding: ActionBinding = {
        action: "TEST_ACTION",
        context: "categorize",
        preventDefault: false,
      };

      expect(binding.action).toBe("TEST_ACTION");
      expect(binding.context).toBe("categorize");
      expect(binding.preventDefault).toBe(false);
    });
  });

  describe("NormalizedKeyboardEvent", () => {
    it("should have required properties", () => {
      const mockEvent = new Event("keydown");
      const normalized: NormalizedKeyboardEvent = {
        key: "a",
        originalEvent: mockEvent as KeyboardEvent,
        isFormElement: false,
        timestamp: Date.now(),
      };

      expect(normalized.key).toBe("a");
      expect(normalized.isFormElement).toBe(false);
      expect(normalized.timestamp).toBeGreaterThan(0);
    });

    it("should properly track form elements", () => {
      const mockEvent = new Event("keydown");
      const normalized: NormalizedKeyboardEvent = {
        key: "input_text",
        originalEvent: mockEvent as KeyboardEvent,
        isFormElement: true,
        timestamp: Date.now(),
      };

      expect(normalized.isFormElement).toBe(true);
    });

    it("should have different timestamps for different events", () => {
      const mockEvent1 = new Event("keydown");
      const normalized1: NormalizedKeyboardEvent = {
        key: "a",
        originalEvent: mockEvent1 as KeyboardEvent,
        isFormElement: false,
        timestamp: 1000,
      };

      const mockEvent2 = new Event("keydown");
      const normalized2: NormalizedKeyboardEvent = {
        key: "b",
        originalEvent: mockEvent2 as KeyboardEvent,
        isFormElement: false,
        timestamp: 2000,
      };

      expect(normalized1.timestamp).not.toBe(normalized2.timestamp);
    });
  });

  describe("KeyboardAction", () => {
    it("should combine event and binding", () => {
      const mockEvent = new Event("keydown");
      const event: NormalizedKeyboardEvent = {
        key: "a",
        originalEvent: mockEvent as KeyboardEvent,
        isFormElement: false,
        timestamp: Date.now(),
      };

      const binding: ActionBinding = {
        action: "SELECT_A",
        preventDefault: true,
      };

      const action: KeyboardAction = { event, binding };

      expect(action.event.key).toBe("a");
      expect(action.binding.action).toBe("SELECT_A");
      expect(action.binding.preventDefault).toBe(true);
    });

    it("should handle context in keyboard actions", () => {
      const mockEvent = new Event("keydown");
      const event: NormalizedKeyboardEvent = {
        key: "1",
        originalEvent: mockEvent as KeyboardEvent,
        isFormElement: false,
        timestamp: Date.now(),
      };

      const binding: ActionBinding = {
        action: "SELECTION_KEY",
        context: "categorize",
        preventDefault: true,
      };

      const action: KeyboardAction = { event, binding };

      expect(action.event.key).toBe("1");
      expect(action.binding.action).toBe("SELECTION_KEY");
      expect(action.binding.context).toBe("categorize");
    });

    it("should preserve all action properties", () => {
      const mockEvent = new Event("keydown");
      const event: NormalizedKeyboardEvent = {
        key: "enter",
        originalEvent: mockEvent as KeyboardEvent,
        isFormElement: true,
        timestamp: 123456,
      };

      const binding: ActionBinding = {
        action: "SUBMIT",
        context: "review",
        preventDefault: true,
      };

      const action: KeyboardAction = { event, binding };

      expect(action.event.key).toBe("enter");
      expect(action.event.isFormElement).toBe(true);
      expect(action.event.timestamp).toBe(123456);
      expect(action.binding.action).toBe("SUBMIT");
      expect(action.binding.context).toBe("review");
      expect(action.binding.preventDefault).toBe(true);
    });
  });
});
