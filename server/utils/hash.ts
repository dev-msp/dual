/**
 * Generate an album hash from album name and album artist
 * Using Bun.hash() for fast, consistent hashing
 */
export function generateAlbumHash(
  album: string | null | undefined,
  albumArtist: string | null | undefined
): string {
  const normalizedAlbum = (album || "").toLowerCase().trim();
  const normalizedArtist = (albumArtist || "").toLowerCase().trim();
  const combined = `${normalizedAlbum}|${normalizedArtist}`;

  // Bun.hash() returns a BigInt, convert to hex string
  const hash = Bun.hash(combined);
  return hash.toString(16);
}
