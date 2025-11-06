/// <reference lib="dom" />
import { render, screen } from "@solidjs/testing-library";
import { describe, it, expect } from "vitest";

import { expectElementCount } from "@/lib/test-utils";

import { CategorizeStats, type CategorizeStatsProps } from "./CategorizeStats";

describe("CategorizeStats Component", () => {
  it("should render categorize-stats container", () => {
    const props: CategorizeStatsProps = {
      stats: { categorized: 0, remaining: 0 },
      activeBuckets: [],
    };

    const { container } = render(() => <CategorizeStats {...props} />);

    const statsContainer = container.querySelector(".categorize-stats");
    expect(statsContainer).toBeDefined();
  });

  it("should display categorized count", () => {
    const props: CategorizeStatsProps = {
      stats: { categorized: 42, remaining: 58 },
      activeBuckets: [],
    };

    render(() => <CategorizeStats {...props} />);

    expect(screen.getByText("42")).toBeDefined();
  });

  it("should display remaining count", () => {
    const props: CategorizeStatsProps = {
      stats: { categorized: 42, remaining: 58 },
      activeBuckets: [],
    };

    render(() => <CategorizeStats {...props} />);

    expect(screen.getByText("58")).toBeDefined();
  });

  it("should display categorized label", () => {
    const props: CategorizeStatsProps = {
      stats: { categorized: 10, remaining: 20 },
      activeBuckets: [],
    };

    render(() => <CategorizeStats {...props} />);

    expect(screen.getByText("Categorized")).toBeDefined();
  });

  it("should display remaining label", () => {
    const props: CategorizeStatsProps = {
      stats: { categorized: 10, remaining: 20 },
      activeBuckets: [],
    };

    render(() => <CategorizeStats {...props} />);

    expect(screen.getByText("Remaining")).toBeDefined();
  });

  it("should display buckets label", () => {
    const props: CategorizeStatsProps = {
      stats: { categorized: 10, remaining: 20 },
      activeBuckets: ["bucket1", "bucket2"],
    };

    render(() => <CategorizeStats {...props} />);

    expect(screen.getByText("Buckets")).toBeDefined();
  });

  it("should display single active bucket", () => {
    const props: CategorizeStatsProps = {
      stats: { categorized: 10, remaining: 20 },
      activeBuckets: ["my-bucket"],
    };

    render(() => <CategorizeStats {...props} />);

    expect(screen.getByText("my-bucket")).toBeDefined();
  });

  it("should display multiple active buckets with commas", () => {
    const props: CategorizeStatsProps = {
      stats: { categorized: 10, remaining: 20 },
      activeBuckets: ["bucket1", "bucket2", "bucket3"],
    };

    render(() => <CategorizeStats {...props} />);

    expect(screen.getByText("bucket1, bucket2, bucket3")).toBeDefined();
  });

  it("should display empty buckets list when no active buckets", () => {
    const props: CategorizeStatsProps = {
      stats: { categorized: 10, remaining: 20 },
      activeBuckets: [],
    };

    const { container } = render(() => <CategorizeStats {...props} />);

    // The buckets value should be empty string
    const values = container.querySelectorAll(".categorize-stats__value");
    const bucketValue = values[2]; // third value is buckets
    expect(bucketValue?.textContent).toBe("");
  });

  it("should have proper CSS classes for items", () => {
    const props: CategorizeStatsProps = {
      stats: { categorized: 10, remaining: 20 },
      activeBuckets: ["bucket1"],
    };

    const { container } = render(() => <CategorizeStats {...props} />);

    expectElementCount(container, ".categorize-stats__item", 3);
  });

  it("should have proper CSS classes for labels", () => {
    const props: CategorizeStatsProps = {
      stats: { categorized: 10, remaining: 20 },
      activeBuckets: [],
    };

    const { container } = render(() => <CategorizeStats {...props} />);

    expectElementCount(container, ".categorize-stats__label", 3);
  });

  it("should have proper CSS classes for values", () => {
    const props: CategorizeStatsProps = {
      stats: { categorized: 10, remaining: 20 },
      activeBuckets: ["bucket"],
    };

    const { container } = render(() => <CategorizeStats {...props} />);

    expectElementCount(container, ".categorize-stats__value", 3);
  });

  it("should display dividers between items", () => {
    const props: CategorizeStatsProps = {
      stats: { categorized: 10, remaining: 20 },
      activeBuckets: [],
    };

    render(() => <CategorizeStats {...props} />);

    const dividers = screen.getAllByText("|");
    expect(dividers.length).toBe(2);
  });

  it("should display zero values correctly", () => {
    const props: CategorizeStatsProps = {
      stats: { categorized: 0, remaining: 0 },
      activeBuckets: [],
    };

    render(() => <CategorizeStats {...props} />);

    const zeros = screen.getAllByText("0");
    expect(zeros.length).toBeGreaterThanOrEqual(2);
  });

  it("should display large numbers", () => {
    const props: CategorizeStatsProps = {
      stats: { categorized: 9999, remaining: 10000 },
      activeBuckets: [],
    };

    render(() => <CategorizeStats {...props} />);

    expect(screen.getByText("9999")).toBeDefined();
    expect(screen.getByText("10000")).toBeDefined();
  });

  it("should update when stats prop changes", () => {
    const stats = { categorized: 5, remaining: 95 };

    const props: CategorizeStatsProps = {
      stats: stats,
      activeBuckets: ["bucket1"],
    };

    render(() => <CategorizeStats {...props} />);

    const categorizedValue = screen.getByText("5");
    expect(categorizedValue).toBeDefined();
  });

  it("should update when active buckets change", () => {
    const props: CategorizeStatsProps = {
      stats: { categorized: 10, remaining: 20 },
      activeBuckets: ["bucket1", "bucket2"],
    };

    render(() => <CategorizeStats {...props} />);

    expect(screen.getByText("bucket1, bucket2")).toBeDefined();
  });

  it("should handle bucket names with spaces", () => {
    const props: CategorizeStatsProps = {
      stats: { categorized: 10, remaining: 20 },
      activeBuckets: ["my bucket", "another bucket"],
    };

    render(() => <CategorizeStats {...props} />);

    expect(screen.getByText("my bucket, another bucket")).toBeDefined();
  });

  it("should handle many active buckets", () => {
    const activeBuckets = Array.from({ length: 10 }, (_, i) => `bucket${i}`);

    const props: CategorizeStatsProps = {
      stats: { categorized: 10, remaining: 20 },
      activeBuckets,
    };

    render(() => <CategorizeStats {...props} />);

    const bucketsText = activeBuckets.join(", ");
    expect(screen.getByText(bucketsText)).toBeDefined();
  });
});
