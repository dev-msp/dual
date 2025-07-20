import * as p from "parjs";
import * as c from "parjs/combinators";

const pNameChar = p.letter().pipe(c.or(p.digit()));

export const pName = p.letter().pipe(
  c.then(pNameChar.pipe(c.or("_"), c.many())),
  c.flatten(),
  c.map((xs) => xs.join("")),
);
