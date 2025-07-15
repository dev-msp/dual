import { albums } from "./schema";

import { db } from ".";

const decoder = new TextDecoder("utf-8");

export const artMapping = () =>
  db
    .select({ albumId: albums.id, artPath: albums.artpath })
    .from(albums)
    .all()
    .reduce(
      (xs, x) => {
        if (x.artPath) {
          xs[x.albumId] = decoder.decode(x.artPath);
        }
        return xs;
      },
      {} as Record<string, string>,
    );
