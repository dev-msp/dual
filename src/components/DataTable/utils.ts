// basic clamp utility
export const clamp = (n: number, min: number, max: number) =>
  Math.min(Math.max(n, min), max);

// simple throttle for event handlers
export const throttle = <T extends (...args: any[]) => void>(
  fn: T,
  delay: number,
) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) return;
    timeout = setTimeout(() => {
      fn(...args);
      timeout = null;
    }, delay);
  };
};
