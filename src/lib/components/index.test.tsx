/// <reference lib="dom" />
import { describe, it, expect } from "vitest";
import { render, screen } from "@solidjs/testing-library";
import { mergeProps } from "solid-js";

import { propsOverride } from "./index";
import { expectElement, expectClass } from "@/lib/test-utils";

describe("propsOverride utility", () => {
  it("should create a component that applies static prop overrides", () => {
    const StyledDiv = propsOverride("div", { class: "custom-class" });

    render(() => <StyledDiv>Test content</StyledDiv>);

    const element = screen.getByText("Test content");
    expect(element.classList.contains("custom-class")).toBe(true);
  });

  it("should merge provided class with override class", () => {
    const StyledDiv = propsOverride("div", { class: "override-class" });

    render(() => <StyledDiv class="user-class">Test</StyledDiv>);

    const element = screen.getByText("Test");
    // mergeProps prioritizes the second argument (override)
    expect(element.className).toBe("override-class");
  });

  it("should apply function-based prop overrides", () => {
    const StyledDiv = propsOverride("div", (props) => ({
      class: `${props.class ?? ""} computed-class`,
    }));

    render(() => <StyledDiv>Test</StyledDiv>);

    const element = screen.getByText("Test");
    expect(element.classList.contains("computed-class")).toBe(true);
  });

  it("should pass through original props", () => {
    const StyledDiv = propsOverride("div", { class: "override" });

    const { container } = render(() => (
      <StyledDiv data-testid="styled-div" id="my-id">
        Test
      </StyledDiv>
    ));

    const element = expectElement(container, '[data-testid="styled-div"]');
    expect(element?.id).toBe("my-id");
  });

  it("should render different HTML elements", () => {
    const StyledButton = propsOverride("button", { class: "btn" });

    render(() => <StyledButton>Click me</StyledButton>);

    const button = screen.getByText("Click me") as HTMLButtonElement;
    expect(button.tagName).toBe("BUTTON");
  });

  it("should render span elements", () => {
    const StyledSpan = propsOverride("span", { class: "badge" });

    render(() => <StyledSpan>Badge</StyledSpan>);

    const span = screen.getByText("Badge") as HTMLSpanElement;
    expect(span.tagName).toBe("SPAN");
  });

  it("should preserve other HTML attributes", () => {
    const StyledDiv = propsOverride("div", { class: "override" });

    const { container } = render(() => (
      <StyledDiv title="Tooltip" aria-label="Label">
        Content
      </StyledDiv>
    ));

    expectElement(container, '[title="Tooltip"]');
    const element = container.querySelector('[title="Tooltip"]');
    expect(element?.getAttribute("aria-label")).toBe("Label");
  });

  it("should handle nested children", () => {
    const StyledDiv = propsOverride("div", { class: "container" });

    render(() => (
      <StyledDiv>
        <span>Nested</span>
      </StyledDiv>
    ));

    const nested = screen.getByText("Nested");
    expect(nested).toBeDefined();
    expectClass(nested.parentElement, "container");
  });

  it("should work with dynamic class in function override", () => {
    const StyledDiv = propsOverride("div", (props) => {
      const baseClass = props.class ?? "";
      return {
        class: `${baseClass} dynamic-class`,
      };
    });

    render(() => <StyledDiv class="user">Test</StyledDiv>);

    const element = screen.getByText("Test");
    expect(element.className).toContain("user");
    expect(element.className).toContain("dynamic-class");
  });

  it("should create styled components using propsOverride", () => {
    // Simulating the Title and NoWrap pattern from the real file
    const Title = propsOverride("div", (props) => ({
      "data-title": true,
      class: `${props.class ?? ""} title`,
    }));

    const { container } = render(() => <Title class="main">My Title</Title>);

    const titleElement = container.querySelector('[data-title="true"]');
    expect(titleElement).toBeDefined();
    expect(titleElement?.classList.contains("title")).toBe(true);
    expect(titleElement?.classList.contains("main")).toBe(true);
  });

  it("should create NoWrap-style components", () => {
    const NoWrap = propsOverride("div", (props) => ({
      class: `${props.class ?? ""} u-no-wrap`,
    }));

    const { container } = render(() => <NoWrap class="text">Long text</NoWrap>);

    const element = container.querySelector(".u-no-wrap");
    expect(element).toBeDefined();
    expect(element?.classList.contains("text")).toBe(true);
  });

  it("should handle empty class in override function", () => {
    const StyledDiv = propsOverride("div", (props) => ({
      class: `${props.class ?? ""} override`,
    }));

    render(() => <StyledDiv>Test</StyledDiv>);

    const element = screen.getByText("Test");
    expect(element.classList.contains("override")).toBe(true);
  });

  it("should merge multiple classes correctly", () => {
    const StyledDiv = propsOverride("div", (props) => ({
      class: `${props.class ?? ""} override-1 override-2`,
    }));

    render(() => <StyledDiv class="user-1 user-2">Test</StyledDiv>);

    const element = screen.getByText("Test");
    expect(element.classList.contains("user-1")).toBe(true);
    expect(element.classList.contains("user-2")).toBe(true);
    expect(element.classList.contains("override-1")).toBe(true);
    expect(element.classList.contains("override-2")).toBe(true);
  });

  it("should preserve content inside styled components", () => {
    const StyledDiv = propsOverride("div", { class: "wrapper" });

    render(() => (
      <StyledDiv>
        <span>First</span>
        <span>Second</span>
      </StyledDiv>
    ));

    expect(screen.getByText("First")).toBeDefined();
    expect(screen.getByText("Second")).toBeDefined();
  });

  it("should handle data attributes in function override", () => {
    const StyledDiv = propsOverride("div", (props) => ({
      "data-component": "styled",
      class: `${props.class ?? ""} styled`,
    }));

    const { container } = render(() => <StyledDiv>Test</StyledDiv>);

    const element = container.querySelector('[data-component="styled"]');
    expect(element).toBeDefined();
  });

  it("should work with conditional rendering inside", () => {
    const StyledDiv = propsOverride("div", { class: "container" });

    render(() => (
      <StyledDiv>
        {true && <span>Visible</span>}
        {false && <span>Hidden</span>}
      </StyledDiv>
    ));

    expect(screen.getByText("Visible")).toBeDefined();
    expect(screen.queryByText("Hidden")).toBeNull();
  });

  it("should not mutate original props", () => {
    const StyledDiv = propsOverride("div", { class: "override" });

    const originalProps = { class: "original", id: "test" };

    render(() => <StyledDiv {...originalProps}>Test</StyledDiv>);

    // Original props should remain unchanged
    expect(originalProps.class).toBe("original");
    expect(originalProps.id).toBe("test");
  });

  it("should handle override function that returns empty object", () => {
    const StyledDiv = propsOverride("div", () => ({}));

    render(() => <StyledDiv class="user">Test</StyledDiv>);

    const element = screen.getByText("Test");
    expect(element.className).toContain("user");
  });

  it("should support different HTML tags", () => {
    const tags = ["div", "section", "article", "header", "footer"];

    tags.forEach((tag) => {
      const StyledComponent = propsOverride(tag as any, { class: "styled" });

      const { container } = render(() => (
        <StyledComponent key={tag}>
          {tag}
        </StyledComponent>
      ));

      const element = container.querySelector(`.styled`);
      expect(element?.tagName.toLowerCase()).toBe(tag);
    });
  });
});
