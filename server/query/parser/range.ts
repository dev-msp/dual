import * as p from "parjs";
import * as c from "parjs/combinators";

import { pInt, softRecovery } from "./base";

export type RangeFilter =
  | { type: "duration"; min?: number; max?: number }
  | { type: "number"; min?: number; max?: number }
  | { type: "date"; min?: DateRangeValue; max?: DateRangeValue };

export type DateRangeValue =
  | { type: "relative"; seconds: number }
  | { type: "absolute"; seconds: number };

export type DateRangeUnit = "m" | "h" | "d" | "w" | "y";

const pNegative = p.string("-").pipe(c.mapConst(false), c.maybe(true));
const pDateRel: p.Parjser<DateRangeValue & { type: "relative" }> =
  pNegative.pipe(
    c.then(pInt),
    c.map(([isPos, num]) => (isPos ? num : -num)),
    c.then(p.anyCharOf("mhdwy")),
    c.map(([amount, unit]) => {
      const mul = {
        m: 1,
        h: 60,
        d: 60 * 24,
        w: 60 * 24 * 7,
        y: 60 * 24 * 365,
      };
      return {
        type: "relative",
        seconds: 60 * amount * mul[unit as keyof typeof mul],
      };
    }),
  );

const beWithinRange =
  (
    lo: number,
    hi: number,
    kind?: Exclude<p.ResultKind, "OK">,
  ): p.ParjsValidator<number> =>
  (n) => {
    if (n >= lo && n <= hi) {
      return true;
    }
    return {
      kind: kind ?? p.ResultKind.SoftFail,
      reason: `value out of range: ${n} outside ${lo} and ${hi}`,
    };
  };

const pYear = pInt.pipe(c.must(beWithinRange(1, Infinity)));
const pMonth = pInt.pipe(c.must(beWithinRange(1, 12)));
const pDay = pInt.pipe(c.must(beWithinRange(1, 31)));

const dateSeg = (parser: p.Parjser<number>) =>
  p.string("-").pipe(c.qthen(parser));

const pDateAbs: p.Parjser<DateRangeValue & { type: "absolute" }> = pYear.pipe(
  c.then(dateSeg(pMonth), dateSeg(pDay).pipe(c.maybe(undefined))),
  c.map(([y, m, d]) => ({
    type: "absolute",
    seconds: Math.floor(new Date(y, m, d ?? 1).getTime() / 1000),
  })),
);

const pDurationBound = pInt.pipe(
  c.manySepBy(":", 3),
  c.must((xs) => xs.length > 1 || { kind: p.ResultKind.SoftFail }),
  c.map((xs) => xs.toReversed().reduce((acc, x, i) => acc + x * 60 ** i, 0)),
);

const pDateBound = pDateAbs.pipe(c.or(pDateRel));

const range = <T extends RangeFilter>(
  type: T["type"],
  part: p.Parjser<T["min"] & T["max"]>,
): p.Parjser<T> => {
  const optionalPart = part.pipe(
    c.each((_, state) => {
      state.bounded = true;
    }),
    c.maybe(undefined),
  );
  return optionalPart.pipe(
    c.thenq(".."),
    c.thenPick((val, { bounded }) =>
      (bounded ? optionalPart : part).pipe(c.map((nextVal) => [val, nextVal])),
    ),
    softRecovery(),
    c.map(([min, max]) => ({ type, min, max }) as T),
  );
};

export const pRange = range("date", pDateBound).pipe(
  c.or(range("duration", pDurationBound), range("number", pInt)),
);
