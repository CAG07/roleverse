// lib/scenes/youtube.ts
// Detects a YouTube video ID from a plain-text URL. Used at ingestion time to
// tag campaign_embeddings chunks whose text contains a link the player wrote
// into their own uploaded document (house rules, session notes, a homebrew
// module) — no dedicated "add video" UI, the link IS the input.

const YOUTUBE_URL_PATTERN =
  /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

export function extractYoutubeVideoId(text: string): string | null {
  const match = text.match(YOUTUBE_URL_PATTERN);
  return match ? match[1] : null;
}
