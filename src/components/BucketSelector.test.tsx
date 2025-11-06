/// <reference lib="dom" />
import { render, screen } from "@solidjs/testing-library";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import { createPropsFactory, expectElement } from "@/lib/test-utils";

import { BucketSelector, type BucketSelectorProps } from "./BucketSelector";

describe("BucketSelector Component", () => {
  const createProps = createPropsFactory<BucketSelectorProps>({
    availableBuckets: [],
    activeBuckets: [],
    loading: false,
    error: null,
    onActiveBucketsChange: vi.fn(),
    onNewBucket: vi.fn(),
    onStart: vi.fn(),
  });

  it("should render component with title", () => {
    const props = createProps();
    render(() => <BucketSelector {...props} />);

    expect(screen.getByText("Categorize Tracks")).toBeDefined();
  });

  it("should display error message when error prop is provided", () => {
    const props = createProps({ error: "Something went wrong" });
    render(() => <BucketSelector {...props} />);

    expect(screen.getByText("Something went wrong")).toBeDefined();
  });

  it("should show empty message when no buckets available", () => {
    const props = createProps({ availableBuckets: [] });
    render(() => <BucketSelector {...props} />);

    expect(screen.getByText("No buckets yet. Create one below.")).toBeDefined();
  });

  it("should display available buckets", () => {
    const props = createProps({
      availableBuckets: ["mood", "era", "genre"],
    });
    render(() => <BucketSelector {...props} />);

    expect(screen.getByText("mood")).toBeDefined();
    expect(screen.getByText("era")).toBeDefined();
    expect(screen.getByText("genre")).toBeDefined();
  });

  it("should render checkboxes for each bucket", () => {
    const props = createProps({
      availableBuckets: ["bucket1", "bucket2"],
    });
    const { container } = render(() => <BucketSelector {...props} />);

    const checkboxes = container.querySelectorAll(".bucket-selector__bucket-checkbox");
    expect(checkboxes.length).toBe(2);
  });

  it("should have alert role on error", () => {
    const props = createProps({ error: "Error message" });
    const { container } = render(() => <BucketSelector {...props} />);

    expectElement(container, '[role="alert"]');
  });

  it("should check checkbox when bucket is active", () => {
    const props = createProps({
      availableBuckets: ["bucket1", "bucket2"],
      activeBuckets: ["bucket1"],
    });
    const { container } = render(() => <BucketSelector {...props} />);

    const checkboxes = container.querySelectorAll(
      ".bucket-selector__bucket-checkbox"
    );

    expect(checkboxes[0].checked).toBe(true);
    expect(checkboxes[1].checked).toBe(false);
  });

  it("should call onActiveBucketsChange when bucket is toggled", async () => {
    const onActiveBucketsChange = vi.fn();
    const props = createProps({
      availableBuckets: ["bucket1"],
      onActiveBucketsChange,
    });
    const { container } = render(() => <BucketSelector {...props} />);

    const checkbox = container.querySelector(
      ".bucket-selector__bucket-checkbox"
    ) as HTMLInputElement;

    await userEvent.click(checkbox);

    expect(onActiveBucketsChange).toHaveBeenCalled();
  });

  it("should add bucket to active list when unchecked bucket is clicked", async () => {
    const onActiveBucketsChange = vi.fn();
    const props = createProps({
      availableBuckets: ["bucket1"],
      activeBuckets: [],
      onActiveBucketsChange,
    });
    const { container } = render(() => <BucketSelector {...props} />);

    const checkbox = container.querySelector(
      ".bucket-selector__bucket-checkbox"
    ) as HTMLInputElement;

    await userEvent.click(checkbox);

    const callArgs = onActiveBucketsChange.mock.calls[0]?.[0] as string[];
    expect(callArgs).toContain("bucket1");
  });

  it("should remove bucket from active list when checked bucket is clicked", async () => {
    const onActiveBucketsChange = vi.fn();
    const props = createProps({
      availableBuckets: ["bucket1", "bucket2"],
      activeBuckets: ["bucket1"],
      onActiveBucketsChange,
    });
    const { container } = render(() => <BucketSelector {...props} />);

    const checkbox = container.querySelector(
      ".bucket-selector__bucket-checkbox"
    ) as HTMLInputElement;

    await userEvent.click(checkbox);

    const callArgs = onActiveBucketsChange.mock.calls[0]?.[0] as string[];
    expect(callArgs).not.toContain("bucket1");
  });

  it("should render text input for new bucket name", () => {
    const props = createProps();
    const { container } = render(() => <BucketSelector {...props} />);

    const input = container.querySelector(
      ".bucket-selector__input"
    ) as HTMLInputElement;
    expect(input).toBeDefined();
    expect(input?.placeholder).toBe("e.g., mood, era, genre");
  });

  it("should update input value on user input", async () => {
    const props = createProps();
    const { container } = render(() => <BucketSelector {...props} />);

    const input = container.querySelector(".bucket-selector__input") as HTMLInputElement;

    await userEvent.type(input, "my-bucket");

    expect(input.value).toBe("my-bucket");
  });

  it("should call onNewBucket when Add Bucket button is clicked", async () => {
    const onNewBucket = vi.fn();
    const props = createProps({ onNewBucket });
    const { container } = render(() => <BucketSelector {...props} />);

    const input = container.querySelector(".bucket-selector__input") as HTMLInputElement;
    const button = screen.getByText("Add Bucket");

    await userEvent.type(input, "new-bucket");
    await userEvent.click(button);

    expect(onNewBucket).toHaveBeenCalledWith("new-bucket");
  });

  it("should call onNewBucket when Enter is pressed in input", async () => {
    const onNewBucket = vi.fn();
    const props = createProps({ onNewBucket });
    const { container } = render(() => <BucketSelector {...props} />);

    const input = container.querySelector(".bucket-selector__input") as HTMLInputElement;

    await userEvent.type(input, "new-bucket");
    await userEvent.keyboard("{Enter}");

    expect(onNewBucket).toHaveBeenCalledWith("new-bucket");
  });

  it("should clear input after adding bucket", async () => {
    const props = createProps();
    const { container } = render(() => <BucketSelector {...props} />);

    const input = container.querySelector(".bucket-selector__input") as HTMLInputElement;
    const button = screen.getByText("Add Bucket");

    await userEvent.type(input, "new-bucket");
    await userEvent.click(button);

    expect(input.value).toBe("");
  });

  it("should not add bucket with empty/whitespace-only name", () => {
    const onNewBucket = vi.fn();
    const props = createProps({ onNewBucket });
    render(() => <BucketSelector {...props} />);

    const button = screen.getByText("Add Bucket");

    // Add Bucket button should be disabled initially
    expect(button.disabled).toBe(true);

    expect(onNewBucket).not.toHaveBeenCalled();
  });

  it("should disable Add Bucket button when input is empty", () => {
    const props = createProps();
    render(() => <BucketSelector {...props} />);

    const button = screen.getByText("Add Bucket");
    expect(button.disabled).toBe(true);
  });

  it("should enable Add Bucket button when input has text", async () => {
    const props = createProps();
    const { container } = render(() => <BucketSelector {...props} />);

    const input = container.querySelector(".bucket-selector__input") as HTMLInputElement;
    const button = screen.getByText("Add Bucket");

    await userEvent.type(input, "bucket");

    expect(button.disabled).toBe(false);
  });

  it("should render Start Categorizing button", () => {
    const props = createProps();
    render(() => <BucketSelector {...props} />);

    expect(screen.getByText("Start Categorizing")).toBeDefined();
  });

  it("should disable Start Categorizing button when no buckets are active", () => {
    const props = createProps({ activeBuckets: [] });
    render(() => <BucketSelector {...props} />);

    const button = screen.getByText("Start Categorizing");
    expect(button.disabled).toBe(true);
  });

  it("should enable Start Categorizing button when buckets are active", () => {
    const props = createProps({ activeBuckets: ["bucket1"] });
    render(() => <BucketSelector {...props} />);

    const button = screen.getByText("Start Categorizing");
    expect(button.disabled).toBe(false);
  });

  it("should call onStart when Start Categorizing button is clicked", async () => {
    const onStart = vi.fn();
    const props = createProps({ activeBuckets: ["bucket1"], onStart });

    render(() => <BucketSelector {...props} />);

    const button = screen.getByText("Start Categorizing");
    await userEvent.click(button);

    expect(onStart).toHaveBeenCalled();
  });

  it("should show Loading text when loading prop is true", () => {
    const props = createProps({ loading: true });

    render(() => <BucketSelector {...props} />);

    expect(screen.getByText("Loading...")).toBeDefined();
  });

  it("should disable all checkboxes when loading", () => {
    const props = createProps({
      availableBuckets: ["bucket1"],
      loading: true,
    });
    const { container } = render(() => <BucketSelector {...props} />);

    const checkbox = container.querySelector(
      ".bucket-selector__bucket-checkbox"
    ) as HTMLInputElement;

    expect(checkbox.disabled).toBe(true);
  });

  it("should disable input when loading", () => {
    const props = createProps({ loading: true });
    const { container } = render(() => <BucketSelector {...props} />);

    const input = container.querySelector(".bucket-selector__input") as HTMLInputElement;

    expect(input.disabled).toBe(true);
  });

  it("should disable Add Bucket button when loading", () => {
    const props = createProps({
      loading: true,
      availableBuckets: [],
      activeBuckets: ["bucket1"],
    });

    render(() => <BucketSelector {...props} />);

    const button = screen.getByText("Add Bucket");
    expect(button.disabled).toBe(true);
  });

  it("should disable Start Categorizing button when loading", () => {
    const props = createProps({ loading: true, activeBuckets: ["bucket1"] });

    render(() => <BucketSelector {...props} />);

    const button = screen.getByText("Loading...");
    expect(button.disabled).toBe(true);
  });

  it("should not add duplicate buckets", async () => {
    const onNewBucket = vi.fn();
    const props = createProps({
      availableBuckets: ["existing"],
      onNewBucket,
    });
    const { container } = render(() => <BucketSelector {...props} />);

    const input = container.querySelector(".bucket-selector__input") as HTMLInputElement;
    const button = screen.getByText("Add Bucket");

    await userEvent.type(input, "existing");
    await userEvent.click(button);

    expect(onNewBucket).not.toHaveBeenCalled();
  });

  it("should trim whitespace from bucket name", async () => {
    const onNewBucket = vi.fn();
    const props = createProps({ onNewBucket });
    const { container } = render(() => <BucketSelector {...props} />);

    const input = container.querySelector(".bucket-selector__input") as HTMLInputElement;
    const button = screen.getByText("Add Bucket");

    await userEvent.type(input, "  new-bucket  ");
    await userEvent.click(button);

    expect(onNewBucket).toHaveBeenCalledWith("new-bucket");
  });

  it("should display section titles", () => {
    const props = createProps();
    render(() => <BucketSelector {...props} />);

    expect(screen.getByText("Select Buckets")).toBeDefined();
    expect(screen.getByText("Create New Bucket")).toBeDefined();
  });

  it("should preserve other active buckets when toggling one", async () => {
    const onActiveBucketsChange = vi.fn();
    const props = createProps({
      availableBuckets: ["bucket1", "bucket2", "bucket3"],
      activeBuckets: ["bucket1", "bucket2"],
      onActiveBucketsChange,
    });
    const { container } = render(() => <BucketSelector {...props} />);

    const checkboxes = container.querySelectorAll(
      ".bucket-selector__bucket-checkbox"
    );

    // Click the third checkbox to add it
    await userEvent.click(checkboxes[2]);

    const callArgs = onActiveBucketsChange.mock.calls[0]?.[0] as string[];
    expect(callArgs).toContain("bucket1");
    expect(callArgs).toContain("bucket2");
    expect(callArgs).toContain("bucket3");
  });
});
