// ---------------------------------------------------------------------------
// Fan Hub Plus — YouTube helpers (Phase 4 multimedia player)
// Extracts a video ID from the common YouTube URL shapes and builds a privacy
// (youtube-nocookie) embed URL plus a watch link.
// ---------------------------------------------------------------------------

const VIDEO_ID_PATTERN =
  /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/;

export function extractYouTubeId(
  url: string | null | undefined,
): string | null {
  if (!url) return null;
  const match = url.match(VIDEO_ID_PATTERN);
  return match?.[1] ?? null;
}

export function youTubeEmbedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}`;
}

export function youTubeWatchUrl(id: string): string {
  return `https://www.youtube.com/watch?v=${id}`;
}