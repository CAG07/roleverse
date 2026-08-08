// lib/storage/check-quota.ts
// Per-campaign aggregate storage cap, enforced client-side before upload —
// matching the existing per-file caps' enforcement level. There's no
// server-side upload route for any Storage bucket today (browser uploads
// directly via the client SDK), so server-side-only aggregate enforcement
// while per-file caps stay client-side would be an inconsistent asymmetry,
// not a real security improvement. Same known gap as the per-file caps:
// bypassable by a modified client. Enforcing an actual hard limit would need
// a Storage-side hook or an upload proxy route — bigger scope than this.

import type { SupabaseClient } from '@supabase/supabase-js';

/** Sums the byte size of every object in a Storage folder (one bucket.list() call). */
export async function getUsedBytes(
  supabase: SupabaseClient,
  bucket: string,
  folderPath: string
): Promise<number> {
  const { data } = await supabase.storage.from(bucket).list(folderPath);
  return (data ?? [])
    .filter((f) => f.id !== null) // exclude the placeholder row for empty folders
    .reduce((sum, f) => sum + ((f.metadata?.size as number | undefined) ?? 0), 0);
}

function formatMB(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/** Throws a user-facing error if adding `newFileBytes` would exceed the per-campaign cap. */
export async function assertWithinQuota(
  supabase: SupabaseClient,
  bucket: string,
  folderPath: string,
  newFileBytes: number,
  limitBytes: number,
  label: string
): Promise<void> {
  const used = await getUsedBytes(supabase, bucket, folderPath);
  if (used + newFileBytes > limitBytes) {
    throw new Error(
      `This campaign has used ${formatMB(used)} of its ${formatMB(limitBytes)} ${label} limit — this file won't fit. Delete something first, or use a smaller file.`
    );
  }
}
