/// <reference lib="dom" />
import { describe, it, expect } from "vitest";
import { render, screen } from "@solidjs/testing-library";
import { createSignal } from "solid-js";

import { AudioProgress } from "./AudioProgress";
import { expectElement, expectClass } from "@/lib/test-utils";

describe("AudioProgress Component", () => {
  it("should render current time", () => {
    render(() => <AudioProgress currentTime={65} duration={null} />);

    const timeElement = screen.getByText("01:05");
    expect(timeElement).toBeDefined();
  });

  it("should render current time and duration", () => {
    render(() => <AudioProgress currentTime={30} duration={180} />);

    const timeElement = screen.getByText("00:30");
    const durationElement = screen.getByText("03:00");

    expect(timeElement).toBeDefined();
    expect(durationElement).toBeDefined();
  });

  it("should render separator when duration is provided", () => {
    const { container } = render(() => (
      <AudioProgress currentTime={0} duration={100} />
    ));

    const separator = screen.getByText("/");
    expect(separator).toBeDefined();
  });

  it("should not render separator when duration is null", () => {
    const { container } = render(() => (
      <AudioProgress currentTime={0} duration={null} />
    ));

    const audioProgress = container.querySelector(".audio-progress");
    expect(audioProgress).toBeDefined();

    // Should only have the time element, no separator or duration
    const timeSpans = container.querySelectorAll(".audio-progress__time");
    expect(timeSpans.length).toBe(1);
  });

  it("should format time correctly (MM:SS format)", () => {
    render(() => <AudioProgress currentTime={125} duration={null} />);

    // 125 seconds = 2 minutes 5 seconds = 02:05
    const timeElement = screen.getByText("02:05");
    expect(timeElement).toBeDefined();
  });

  it("should pad single digit minutes with leading zero", () => {
    render(() => <AudioProgress currentTime={45} duration={null} />);

    // 45 seconds = 0 minutes 45 seconds = 00:45
    const timeElement = screen.getByText("00:45");
    expect(timeElement).toBeDefined();
  });

  it("should pad single digit seconds with leading zero", () => {
    render(() => <AudioProgress currentTime={61} duration={null} />);

    // 61 seconds = 1 minute 1 second = 01:01
    const timeElement = screen.getByText("01:01");
    expect(timeElement).toBeDefined();
  });

  it("should handle zero time", () => {
    const { container } = render(() => (
      <AudioProgress currentTime={0} duration={0} />
    ));

    const timeElement = container.querySelector(".audio-progress__time");
    expect(timeElement?.textContent).toBe("00:00");
  });

  it("should handle large durations", () => {
    render(() => <AudioProgress currentTime={3661} duration={7200} />);

    // 3661 seconds = 61 minutes 1 second = 61:01
    // 7200 seconds = 120 minutes = 120:00
    const timeElement = screen.getByText("61:01");
    const durationElement = screen.getByText("120:00");

    expect(timeElement).toBeDefined();
    expect(durationElement).toBeDefined();
  });

  it("should render with proper CSS classes", () => {
    const { container } = render(() => (
      <AudioProgress currentTime={30} duration={100} />
    ));

    expectElement(container, ".audio-progress");
    expectElement(container, ".audio-progress__time");
    expectElement(container, ".audio-progress__separator");
    expectElement(container, ".audio-progress__duration");
  });

  it("should update when props change", () => {
    const [currentTime, setCurrentTime] = createSignal(10);

    const { container } = render(() => (
      <AudioProgress currentTime={currentTime()} duration={100} />
    ));

    let timeElement = container.querySelector(".audio-progress__time");
    expect(timeElement?.textContent).toBe("00:10");

    // Update currentTime
    setCurrentTime(50);

    timeElement = container.querySelector(".audio-progress__time");
    expect(timeElement?.textContent).toBe("00:50");
  });

  it("should handle fractional seconds by flooring", () => {
    render(() => <AudioProgress currentTime={65.9} duration={180.7} />);

    // 65.9 floored = 65 = 01:05
    // 180.7 floored = 180 = 03:00
    const timeElement = screen.getByText("01:05");
    const durationElement = screen.getByText("03:00");

    expect(timeElement).toBeDefined();
    expect(durationElement).toBeDefined();
  });
});
