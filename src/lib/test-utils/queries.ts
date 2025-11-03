/**
 * Element query helpers for cleaner test assertions
 * Reduces boilerplate for common DOM query patterns
 */

/**
 * Query element and verify it exists
 */
export function expectElement(
  container: HTMLElement,
  selector: string
): Element {
  const element = container.querySelector(selector);
  if (!element) {
    throw new Error(`Element not found: ${selector}`);
  }
  return element;
}

/**
 * Query all elements and verify count
 */
export function expectElementCount(
  container: HTMLElement,
  selector: string,
  expectedCount: number
): NodeListOf<Element> {
  const elements = container.querySelectorAll(selector);
  if (elements.length !== expectedCount) {
    throw new Error(
      `Expected ${expectedCount} elements matching "${selector}", found ${elements.length}`
    );
  }
  return elements;
}

/**
 * Verify element has CSS class
 */
export function expectClass(element: Element | null | undefined, className: string): void {
  if (!element) {
    throw new Error("Element is null or undefined");
  }
  if (!element.classList.contains(className)) {
    throw new Error(
      `Element does not have class "${className}". Has: ${element.className}`
    );
  }
}

/**
 * Verify element does NOT have CSS class
 */
export function expectNotClass(
  element: Element | null | undefined,
  className: string
): void {
  if (!element) {
    throw new Error("Element is null or undefined");
  }
  if (element.classList.contains(className)) {
    throw new Error(
      `Element should not have class "${className}". Has: ${element.className}`
    );
  }
}

/**
 * Query element and verify it has specific class
 */
export function expectElementWithClass(
  container: HTMLElement,
  selector: string,
  className: string
): Element {
  const element = expectElement(container, selector);
  expectClass(element, className);
  return element;
}

/**
 * Get typed element as specific HTML element type
 */
export function getElementAs<T extends HTMLElement>(
  container: HTMLElement,
  selector: string,
  type: new () => T
): T {
  const element = expectElement(container, selector);
  if (!(element instanceof type)) {
    throw new Error(`Element is not of expected type`);
  }
  return element;
}

/**
 * Verify element has specific attribute value
 */
export function expectAttribute(
  element: Element | null | undefined,
  attrName: string,
  expectedValue: string
): void {
  if (!element) {
    throw new Error("Element is null or undefined");
  }
  const value = element.getAttribute(attrName);
  if (value !== expectedValue) {
    throw new Error(
      `Expected attribute "${attrName}" to be "${expectedValue}", got "${value}"`
    );
  }
}
