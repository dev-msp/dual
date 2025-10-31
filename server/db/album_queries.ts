import { albums } from "./schema";
import { generateAlbumHash } from "../utils/hash";

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

/**
 * Build bidirectional mappings between album hashes and album IDs
 * Returns both hash->id and id->hash maps
 */
export const buildAlbumHashMappings = () => {
  const allAlbums = db
    .select({
      id: albums.id,
      album: albums.album,
      albumartist: albums.albumartist,
    })
    .from(albums)
    .all();

  const hashToId = new Map<string, number>();
  const idToHash = new Map<number, string>();

  for (const albumRecord of allAlbums) {
    const hash = generateAlbumHash(albumRecord.album, albumRecord.albumartist);
    hashToId.set(hash, albumRecord.id);
    idToHash.set(albumRecord.id, hash);
  }

  return { hashToId, idToHash };
};
