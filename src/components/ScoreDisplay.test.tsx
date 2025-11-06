/// <reference lib="dom" />
import { render, screen } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";

import { setupFakeTimers, createScoreInfoFactory, expectElement } from "@/lib/test-utils";

import { ScoreDisplay } from "./ScoreDisplay";

describe("ScoreDisplay Component", () => {
  setupFakeTimers();

  const createMockScoreInfo = createScoreInfoFactory();

  it("should render when visible", () => {
    const onComplete = vi.fn();
    const trackA = createMockScoreInfo();

    render(() => (
      <ScoreDisplay trackA={trackA} trackB={null} onComplete={onComplete} />
    ));

    expect(screen.getByRole("status")).toBeDefined();
  });

  it("should display track A score info", () => {
    const onComplete = vi.fn();
    const trackA = createMockScoreInfo({ oldRating: 1500, newRating: 1520 });

    render(() => (
      <ScoreDisplay trackA={trackA} trackB={null} onComplete={onComplete} />
    ));

    expect(screen.getByText("Track A")).toBeDefined();
    expect(screen.getByText("1500")).toBeDefined();
    expect(screen.getByText("1520")).toBeDefined();
  });

  it("should display track B score info", () => {
    const onComplete = vi.fn();
    const trackB = createMockScoreInfo({ side: "B", oldRating: 1400, newRating: 1385 });

    render(() => (
      <ScoreDisplay trackA={null} trackB={trackB} onComplete={onComplete} />
    ));

    expect(screen.getByText("Track B")).toBeDefined();
    expect(screen.getByText("1400")).toBeDefined();
    expect(screen.getByText("1385")).toBeDefined();
  });

  it("should display both tracks when provided", () => {
    const onComplete = vi.fn();
    const trackA = createMockScoreInfo();
    const trackB = createMockScoreInfo({ side: "B" });

    render(() => (
      <ScoreDisplay trackA={trackA} trackB={trackB} onComplete={onComplete} />
    ));

    expect(screen.getByText("Track A")).toBeDefined();
    expect(screen.getByText("Track B")).toBeDefined();
  });

  it("should display positive score change with up arrow", () => {
    const onComplete = vi.fn();
    const trackA = createMockScoreInfo({ change: 25 });

    const { container } = render(() => (
      <ScoreDisplay trackA={trackA} trackB={null} onComplete={onComplete} />
    ));

    const changeIcon = container.querySelector(".score-display__change-icon");
    expect(changeIcon?.textContent).toBe("↑");
  });

  it("should display negative score change with down arrow", () => {
    const onComplete = vi.fn();
    const trackA = createMockScoreInfo({ change: -15 });

    const { container } = render(() => (
      <ScoreDisplay trackA={trackA} trackB={null} onComplete={onComplete} />
    ));

    const changeIcon = container.querySelector(".score-display__change-icon");
    expect(changeIcon?.textContent).toBe("↓");
  });

  it("should display neutral change with equals sign", () => {
    const onComplete = vi.fn();
    const trackA = createMockScoreInfo({ change: 0 });

    const { container } = render(() => (
      <ScoreDisplay trackA={trackA} trackB={null} onComplete={onComplete} />
    ));

    const changeIcon = container.querySelector(".score-display__change-icon");
    expect(changeIcon?.textContent).toBe("=");
  });

  it("should format positive change with plus sign", () => {
    const onComplete = vi.fn();
    const trackA = createMockScoreInfo({ change: 25 });

    render(() => (
      <ScoreDisplay trackA={trackA} trackB={null} onComplete={onComplete} />
    ));

    expect(screen.getByText("+25")).toBeDefined();
  });

  it("should format negative change without extra sign", () => {
    const onComplete = vi.fn();
    const trackA = createMockScoreInfo({ change: -15 });

    render(() => (
      <ScoreDisplay trackA={trackA} trackB={null} onComplete={onComplete} />
    ));

    expect(screen.getByText("-15")).toBeDefined();
  });

  it("should display conservative rating", () => {
    const onComplete = vi.fn();
    const trackA = createMockScoreInfo({ conservativeRating: 1485 });

    render(() => (
      <ScoreDisplay trackA={trackA} trackB={null} onComplete={onComplete} />
    ));

    expect(screen.getByText(/Conservative: 1485/)).toBeDefined();
  });

  it("should display confidence stars for high confidence", () => {
    const onComplete = vi.fn();
    const trackA = createMockScoreInfo({ confidence: 0.9 });

    const { container } = render(() => (
      <ScoreDisplay trackA={trackA} trackB={null} onComplete={onComplete} />
    ));

    const confidenceElement = container.querySelector(".score-display__confidence");
    // 0.9 * 5 = 4.5 → rounds to 5 stars
    const stars = confidenceElement?.textContent;
    expect(stars).toBe("★★★★★");
  });

  it("should display confidence stars for medium confidence", () => {
    const onComplete = vi.fn();
    const trackA = createMockScoreInfo({ confidence: 0.6 });

    const { container } = render(() => (
      <ScoreDisplay trackA={trackA} trackB={null} onComplete={onComplete} />
    ));

    const confidenceElement = container.querySelector(".score-display__confidence");
    // 0.6 * 5 = 3 → 3 stars
    const stars = confidenceElement?.textContent;
    expect(stars).toBe("★★★☆☆");
  });

  it("should display confidence stars for low confidence", () => {
    const onComplete = vi.fn();
    const trackA = createMockScoreInfo({ confidence: 0.2 });

    const { container } = render(() => (
      <ScoreDisplay trackA={trackA} trackB={null} onComplete={onComplete} />
    ));

    const confidenceElement = container.querySelector(".score-display__confidence");
    // 0.2 * 5 = 1 → 1 star (minimum)
    const stars = confidenceElement?.textContent;
    expect(stars).toBe("★☆☆☆☆");
  });

  it("should apply correct CSS class for increase", () => {
    const onComplete = vi.fn();
    const trackA = createMockScoreInfo({ change: 20 });

    const { container } = render(() => (
      <ScoreDisplay trackA={trackA} trackB={null} onComplete={onComplete} />
    ));

    expectElement(container, ".score-display__change--increase");
  });

  it("should apply correct CSS class for decrease", () => {
    const onComplete = vi.fn();
    const trackA = createMockScoreInfo({ change: -15 });

    const { container } = render(() => (
      <ScoreDisplay trackA={trackA} trackB={null} onComplete={onComplete} />
    ));

    expectElement(container, ".score-display__change--decrease");
  });

  it("should apply correct CSS class for neutral", () => {
    const onComplete = vi.fn();
    const trackA = createMockScoreInfo({ change: 0 });

    const { container } = render(() => (
      <ScoreDisplay trackA={trackA} trackB={null} onComplete={onComplete} />
    ));

    expectElement(container, ".score-display__change--neutral");
  });

  it("should call onComplete after default auto-advance time", () => {
    const onComplete = vi.fn();
    const trackA = createMockScoreInfo();

    render(() => (
      <ScoreDisplay trackA={trackA} trackB={null} onComplete={onComplete} />
    ));

    expect(onComplete).not.toHaveBeenCalled();

    // Advance timers by 3 seconds (default)
    vi.advanceTimersByTime(3000);

    expect(onComplete).toHaveBeenCalled();
  });

  it("should respect custom autoAdvanceTime", () => {
    const onComplete = vi.fn();
    const trackA = createMockScoreInfo();

    render(() => (
      <ScoreDisplay
        trackA={trackA}
        trackB={null}
        onComplete={onComplete}
        autoAdvanceTime={1000}
      />
    ));

    // Advance by 500ms - should not trigger
    vi.advanceTimersByTime(500);
    expect(onComplete).not.toHaveBeenCalled();

    // Advance by another 600ms - should trigger
    vi.advanceTimersByTime(600);
    expect(onComplete).toHaveBeenCalled();
  });

  it("should apply high confidence CSS class", () => {
    const onComplete = vi.fn();
    const trackA = createMockScoreInfo({ confidence: 0.85 });

    const { container } = render(() => (
      <ScoreDisplay trackA={trackA} trackB={null} onComplete={onComplete} />
    ));

    expectElement(container, ".score-display__confidence--high");
  });

  it("should apply medium confidence CSS class", () => {
    const onComplete = vi.fn();
    const trackA = createMockScoreInfo({ confidence: 0.65 });

    const { container } = render(() => (
      <ScoreDisplay trackA={trackA} trackB={null} onComplete={onComplete} />
    ));

    expectElement(container, ".score-display__confidence--medium");
  });

  it("should apply low confidence CSS class", () => {
    const onComplete = vi.fn();
    const trackA = createMockScoreInfo({ confidence: 0.3 });

    const { container } = render(() => (
      <ScoreDisplay trackA={trackA} trackB={null} onComplete={onComplete} />
    ));

    expectElement(container, ".score-display__confidence--low");
  });

  it("should display hint text", () => {
    const onComplete = vi.fn();
    const trackA = createMockScoreInfo();

    render(() => (
      <ScoreDisplay trackA={trackA} trackB={null} onComplete={onComplete} />
    ));

    expect(screen.getByText(/Press any key to continue/)).toBeDefined();
  });

  it("should hide component when not visible", () => {
    const onComplete = vi.fn();
    const trackA = createMockScoreInfo();

    const { container } = render(() => (
      <ScoreDisplay trackA={trackA} trackB={null} onComplete={onComplete} />
    ));

    // Component should be visible initially
    const statusDiv = container.querySelector('[role="status"]');
    expect(statusDiv).toBeDefined();

    // Advance timer to trigger completion
    vi.advanceTimersByTime(3000);

    // Component should be hidden after onComplete
    expect(onComplete).toHaveBeenCalled();
  });

  it("should handle null both trackA and trackB", () => {
    const onComplete = vi.fn();

    render(() => (
      <ScoreDisplay trackA={null} trackB={null} onComplete={onComplete} />
    ));

    expect(screen.getByRole("status")).toBeDefined();
  });

  it("should format change values to fixed decimal places", () => {
    const onComplete = vi.fn();
    const trackA = createMockScoreInfo({ change: 22.7 });

    render(() => (
      <ScoreDisplay trackA={trackA} trackB={null} onComplete={onComplete} />
    ));

    // Should be rounded to "23" (toFixed(0))
    expect(screen.getByText("+23")).toBeDefined();
  });
});
