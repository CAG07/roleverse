// lib/rag/fetchers/utils.ts
// Shared utilities for RAG fetcher implementations.

/**
 * Temporary upstream failures worth retrying: rate limiting, and gateway or
 * origin-down errors (Open5e sits behind Cloudflare, which returns 52x codes
 * when its origin is briefly unreachable).
 */
const RETRYABLE_STATUSES = new Set([429, 502, 503, 504, 520, 521, 522, 523, 524]);

/**
 * Fetch a URL with a generous timeout and exponential backoff retries.
 * Retries on any thrown error (network failure, timeout, DNS) and on the
 * temporary statuses above. Other non-OK responses (404, 403, 500) indicate a
 * real problem that retrying won't fix, so they're returned for the caller to
 * handle.
 *
 * Total worst case: timeoutMs * MAX_ATTEMPTS + sum(backoffs) ≈ 3 minutes at the
 * default. The timeout also covers reading the response body, so pass a longer
 * one for large downloads (the PF2E tarball takes a couple of minutes).
 */
export async function fetchWithRetry(
  url: string,
  init: RequestInit = {},
  timeoutMs = 60_000
): Promise<Response> {
  const MAX_ATTEMPTS = 3;

  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!RETRYABLE_STATUSES.has(response.status) || attempt === MAX_ATTEMPTS) {
        return response;
      }
      lastError = new Error(`HTTP ${response.status}`);
    } catch (err) {
      lastError = err;
      if (attempt === MAX_ATTEMPTS) break;
    }

    const backoffMs = 2000 * attempt;
    console.warn(
      `[fetch-retry] ${url} failed (attempt ${attempt}/${MAX_ATTEMPTS}), ` +
        `retrying in ${backoffMs}ms: ${lastError instanceof Error ? lastError.message : String(lastError)}`
    );
    await new Promise((resolve) => setTimeout(resolve, backoffMs));
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`fetch failed after ${MAX_ATTEMPTS} attempts: ${String(lastError)}`);
}
