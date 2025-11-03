/// <reference lib="dom" />
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@solidjs/testing-library";
import userEvent from "@testing-library/user-event";

import { Player } from "./Player";
import { expectElement, expectAttribute } from "@/lib/test-utils";

describe("Player Component", () => {
  it("should render player div with correct ID", () => {
    const mockRef = vi.fn();
    const mockPlayPause = vi.fn();

    const { container } = render(() => (
      <Player ref={mockRef} onPlayPause={mockPlayPause} />
    ));

    const player = container.querySelector("#player");
    expect(player).toBeDefined();
    expect(player?.classList.contains("player")).toBe(true);
  });

  it("should call ref with audio element", () => {
    const mockRef = vi.fn();
    const mockPlayPause = vi.fn();

    render(() => <Player ref={mockRef} onPlayPause={mockPlayPause} />);

    expect(mockRef).toHaveBeenCalled();
    const audioElement = mockRef.mock.calls[0][0];
    expect(audioElement).toBeDefined();
    expect(audioElement.tagName).toBe("AUDIO");
  });

  it("should render audio element with hidden class", () => {
    const mockRef = vi.fn();
    const mockPlayPause = vi.fn();

    const { container } = render(() => (
      <Player ref={mockRef} onPlayPause={mockPlayPause} />
    ));

    const audio = container.querySelector("audio");
    expect(audio).toBeDefined();
    expect(audio?.classList.contains("hidden")).toBe(true);
  });

  it("should set audio preload to metadata", () => {
    const mockRef = vi.fn();
    const mockPlayPause = vi.fn();

    const { container } = render(() => (
      <Player ref={mockRef} onPlayPause={mockPlayPause} />
    ));

    const audio = container.querySelector("audio") as HTMLAudioElement;
    expect(audio?.preload).toBe("metadata");
  });

  it("should render play/pause button with SVG", () => {
    const mockRef = vi.fn();
    const mockPlayPause = vi.fn();

    const { container } = render(() => (
      <Player ref={mockRef} onPlayPause={mockPlayPause} />
    ));

    const svg = container.querySelector("svg");
    expect(svg).toBeDefined();
  });

  it("should render play/pause button with correct role", () => {
    const mockRef = vi.fn();
    const mockPlayPause = vi.fn();

    const { container } = render(() => (
      <Player ref={mockRef} onPlayPause={mockPlayPause} />
    ));

    const button = container.querySelector('[role="button"]');
    expect(button).toBeDefined();
  });

  it("should render play icon (triangle)", () => {
    const mockRef = vi.fn();
    const mockPlayPause = vi.fn();

    const { container } = render(() => (
      <Player ref={mockRef} onPlayPause={mockPlayPause} />
    ));

    const path = container.querySelector('path[d*="40,30"]');
    expect(path).toBeDefined();
  });

  it("should have data-action-play-pause attribute on button div", () => {
    const mockRef = vi.fn();
    const mockPlayPause = vi.fn();

    const { container } = render(() => (
      <Player ref={mockRef} onPlayPause={mockPlayPause} />
    ));

    const button = container.querySelector('[data-action-play-pause]');
    expect(button).toBeDefined();
  });

  it("should have aria-label on SVG", () => {
    const mockRef = vi.fn();
    const mockPlayPause = vi.fn();

    const { container } = render(() => (
      <Player ref={mockRef} onPlayPause={mockPlayPause} />
    ));

    const svg = container.querySelector('svg[aria-label="Play/Pause"]');
    expect(svg).toBeDefined();
  });

  it("should call onPlayPause when SVG is clicked", async () => {
    const mockRef = vi.fn();
    const mockPlayPause = vi.fn();

    const { container } = render(() => (
      <Player ref={mockRef} onPlayPause={mockPlayPause} />
    ));

    const svg = container.querySelector("svg") as SVGElement;
    await userEvent.click(svg);

    expect(mockPlayPause).toHaveBeenCalled();
  });

  it("should call onPlayPause multiple times on repeated clicks", async () => {
    const mockRef = vi.fn();
    const mockPlayPause = vi.fn();

    const { container } = render(() => (
      <Player ref={mockRef} onPlayPause={mockPlayPause} />
    ));

    const svg = container.querySelector("svg") as SVGElement;

    await userEvent.click(svg);
    await userEvent.click(svg);
    await userEvent.click(svg);

    expect(mockPlayPause).toHaveBeenCalledTimes(3);
  });

  it("should have SVG with proper viewBox", () => {
    const mockRef = vi.fn();
    const mockPlayPause = vi.fn();

    const { container } = render(() => (
      <Player ref={mockRef} onPlayPause={mockPlayPause} />
    ));

    const svg = expectElement(container, "svg");
    expectAttribute(svg, "viewBox", "0 0 100 100");
  });

  it("should render circle in SVG", () => {
    const mockRef = vi.fn();
    const mockPlayPause = vi.fn();

    const { container } = render(() => (
      <Player ref={mockRef} onPlayPause={mockPlayPause} />
    ));

    const circle = expectElement(container, "circle");
    expectAttribute(circle, "cx", "50");
    expectAttribute(circle, "cy", "50");
    expectAttribute(circle, "r", "48");
  });

  it("should have SVG with proper namespace", () => {
    const mockRef = vi.fn();
    const mockPlayPause = vi.fn();

    const { container } = render(() => (
      <Player ref={mockRef} onPlayPause={mockPlayPause} />
    ));

    const svg = expectElement(container, "svg");
    expectAttribute(svg, "xmlns", "http://www.w3.org/2000/svg");
  });

  it("should have SVG with tabindex", () => {
    const mockRef = vi.fn();
    const mockPlayPause = vi.fn();

    const { container } = render(() => (
      <Player ref={mockRef} onPlayPause={mockPlayPause} />
    ));

    const svg = expectElement(container, "svg");
    expectAttribute(svg, "tabindex", "1");
  });
});
