import { describe, it, expect } from "bun:test";
import {
  reviewKeybindings,
  categorizeKeybindings,
  composeKeymaps,
} from "./keymaps";

describe("reviewKeybindings", () => {
  it("should map 'a' to SELECT_A action", () => {
    const binding = reviewKeybindings("a");
    expect(binding).toBeDefined();
    expect(binding?.action).toBe("SELECT_A");
    expect(binding?.preventDefault).toBe(true);
  });

  it("should map 'b' to SELECT_B action", () => {
    const binding = reviewKeybindings("b");
    expect(binding).toBeDefined();
    expect(binding?.action).toBe("SELECT_B");
    expect(binding?.preventDefault).toBe(true);
  });

  it("should map 'd' to DRAW action", () => {
    const binding = reviewKeybindings("d");
    expect(binding).toBeDefined();
    expect(binding?.action).toBe("DRAW");
    expect(binding?.preventDefault).toBe(true);
  });

  it("should map 's' to SKIP action", () => {
    const binding = reviewKeybindings("s");
    expect(binding).toBeDefined();
    expect(binding?.action).toBe("SKIP");
    expect(binding?.preventDefault).toBe(true);
  });

  it("should map 'q' to QUIT action", () => {
    const binding = reviewKeybindings("q");
    expect(binding).toBeDefined();
    expect(binding?.action).toBe("QUIT");
    expect(binding?.preventDefault).toBe(true);
  });

  it("should map space to CYCLE_PLAYBACK action", () => {
    const binding = reviewKeybindings(" ");
    expect(binding).toBeDefined();
    expect(binding?.action).toBe("CYCLE_PLAYBACK");
    expect(binding?.preventDefault).toBe(true);
  });

  it("should map arrowleft to SEEK_BACKWARD action", () => {
    const binding = reviewKeybindings("arrowleft");
    expect(binding).toBeDefined();
    expect(binding?.action).toBe("SEEK_BACKWARD");
    expect(binding?.preventDefault).toBe(true);
  });

  it("should map arrowright to SEEK_FORWARD action", () => {
    const binding = reviewKeybindings("arrowright");
    expect(binding).toBeDefined();
    expect(binding?.action).toBe("SEEK_FORWARD");
    expect(binding?.preventDefault).toBe(true);
  });

  it("should return undefined for unmapped keys", () => {
    expect(reviewKeybindings("x")).toBeUndefined();
    expect(reviewKeybindings("z")).toBeUndefined();
    expect(reviewKeybindings("1")).toBeUndefined();
  });
});

describe("categorizeKeybindings", () => {
  it("should map 'enter' to SUBMIT action", () => {
    const binding = categorizeKeybindings("enter");
    expect(binding).toBeDefined();
    expect(binding?.action).toBe("SUBMIT");
    expect(binding?.preventDefault).toBe(true);
  });

  it("should map 'q' to QUIT action", () => {
    const binding = categorizeKeybindings("q");
    expect(binding).toBeDefined();
    expect(binding?.action).toBe("QUIT");
    expect(binding?.preventDefault).toBe(true);
  });

  it("should map numeric keys 0-9 to SELECTION_KEY action", () => {
    for (let i = 0; i <= 9; i++) {
      const binding = categorizeKeybindings(i.toString());
      expect(binding).toBeDefined();
      expect(binding?.action).toBe("SELECTION_KEY");
      expect(binding?.preventDefault).toBe(true);
    }
  });

  it("should map homerow keys (a, s, d, f, g, h, j, k, l) to SELECTION_KEY action", () => {
    const homerowKeys = ["a", "s", "d", "f", "g", "h", "j", "k", "l"];
    for (const key of homerowKeys) {
      const binding = categorizeKeybindings(key);
      expect(binding).toBeDefined();
      expect(binding?.action).toBe("SELECTION_KEY");
      expect(binding?.preventDefault).toBe(true);
    }
  });

  it("should return undefined for unmapped keys", () => {
    expect(categorizeKeybindings("b")).toBeUndefined();
    expect(categorizeKeybindings("c")).toBeUndefined();
    expect(categorizeKeybindings("enter ")).toBeUndefined();
    expect(categorizeKeybindings("arrowleft")).toBeUndefined();
  });
});

describe("composeKeymaps", () => {
  it("should return undefined when no keymaps have a binding for the key", () => {
    const composed = composeKeymaps(reviewKeybindings, categorizeKeybindings);
    expect(composed("unmapped")).toBeUndefined();
  });

  it("should find binding from first keymap if not in second", () => {
    const composed = composeKeymaps(reviewKeybindings, categorizeKeybindings);
    const binding = composed("arrowright");
    expect(binding).toBeDefined();
    expect(binding?.action).toBe("SEEK_FORWARD");
  });

  it("should prefer binding from second keymap when both have the key", () => {
    const composed = composeKeymaps(reviewKeybindings, categorizeKeybindings);
    const binding = composed("q");
    // 'q' is in both, categorizeKeybindings (second) should win
    expect(binding).toBeDefined();
    expect(binding?.action).toBe("QUIT");
  });

  it("should support multiple keymaps with precedence order", () => {
    const customKeymap1 = (key: string) => {
      if (key === "x") return { action: "ACTION_X", preventDefault: true };
      return undefined;
    };

    const customKeymap2 = (key: string) => {
      if (key === "y") return { action: "ACTION_Y", preventDefault: true };
      if (key === "x") return { action: "ACTION_X_OVERRIDE", preventDefault: true };
      return undefined;
    };

    const composed = composeKeymaps(customKeymap1, customKeymap2);

    // y should come from customKeymap2
    const bindingY = composed("y");
    expect(bindingY?.action).toBe("ACTION_Y");

    // x should be overridden by customKeymap2
    const bindingX = composed("x");
    expect(bindingX?.action).toBe("ACTION_X_OVERRIDE");
  });

  it("should handle three or more keymaps", () => {
    const keymap1 = (key: string) => {
      if (key === "1") return { action: "ACTION_1", preventDefault: true };
      return undefined;
    };

    const keymap2 = (key: string) => {
      if (key === "2") return { action: "ACTION_2", preventDefault: true };
      return undefined;
    };

    const keymap3 = (key: string) => {
      if (key === "3") return { action: "ACTION_3", preventDefault: true };
      if (key === "2") return { action: "ACTION_2_OVERRIDE", preventDefault: true };
      return undefined;
    };

    const composed = composeKeymaps(keymap1, keymap2, keymap3);

    expect(composed("1")?.action).toBe("ACTION_1");
    expect(composed("2")?.action).toBe("ACTION_2_OVERRIDE");
    expect(composed("3")?.action).toBe("ACTION_3");
    expect(composed("4")).toBeUndefined();
  });

  it("should preserve binding properties through composition", () => {
    const keymap1 = (key: string) => {
      if (key === "a")
        return {
          action: "ACTION_A",
          preventDefault: true,
          context: "review",
        };
      return undefined;
    };

    const composed = composeKeymaps(keymap1);
    const binding = composed("a");

    expect(binding?.action).toBe("ACTION_A");
    expect(binding?.preventDefault).toBe(true);
    expect(binding?.context).toBe("review");
  });

  it("should handle empty composition", () => {
    const composed = composeKeymaps();
    expect(composed("any")).toBeUndefined();
  });

  it("should handle single keymap in composition", () => {
    const composed = composeKeymaps(reviewKeybindings);
    const binding = composed("a");
    expect(binding?.action).toBe("SELECT_A");
  });
});
