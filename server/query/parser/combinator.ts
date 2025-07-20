import * as p from "parjs";
import * as c from "parjs/combinators";

type OptionalPrefixOpts<T, R = T> = {
  prefix: string;
  stateTransform: (state: p.UserState) => void;
  mapper?: (result: T, state: p.UserState) => R;
};

export const optionalPrefix = <T, R = T>({
  prefix,
  stateTransform,
  mapper,
}: OptionalPrefixOpts<T, R>): p.ParjsCombinator<T, T | R> => {
  return (parser) =>
    p.string(prefix).pipe(
      c.each((_, state) => stateTransform(state)),
      c.qthen(parser),
      c.map((val, state) => mapper?.(val, state) ?? val),
      c.or(parser),
      c.replaceState((state) => ({ ...state })),
    );
};

type PrefixFlagOpts = { prefix: string; key: string };

export const prefixFlag = <T>({
  prefix,
  key,
}: PrefixFlagOpts): p.ParjsCombinator<T, T> =>
  optionalPrefix<T>({
    prefix,
    stateTransform: (state) => {
      state[key] = !state[key];
    },
  });
