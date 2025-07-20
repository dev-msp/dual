export const partition = <T>(
  collection: T[],
  predicate: (elem: T) => boolean,
): [T[], T[]] => {
  const truthy: T[] = [];
  const falsy: T[] = [];
  for (const elem of collection) {
    (predicate(elem) ? truthy : falsy).push(elem);
  }
  return [truthy, falsy];
};
