import * as p from "parjs";
import * as c from "parjs/combinators";

export const softRecovery = <T>(): p.ParjsCombinator<T, T> =>
  c.recover(() => ({ kind: p.ResultKind.SoftFail }));

export const pInt = p.digit().pipe(
  c.many1(),
  c.map((xs) => parseInt(xs.join(""))),
);
