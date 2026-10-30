// lib/rag/fetchers/utils.ts
// Shared utilities for RAG fetcher implementations.

/**
 * Fetch a URL with a generous timeout and exponential backoff retries.
 * Retries on any thrown error (network failure, timeout, DNS). Does NOT retry
 * on non-OK HTTP responses — those indicate a real problem (404, 403, 500)
 * that retrying will not fix, and the caller should handle them.
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
      return response;
    } catch (err) {
      lastError = err;
      if (attempt < MAX_ATTEMPTS) {
        const backoffMs = 2000 * attempt;
        console.warn(
          `[fetch-retry] ${url} failed (attempt ${attempt}/${MAX_ATTEMPTS}), ` +
            `retrying in ${backoffMs}ms: ${
              err instanceof Error ? err.message : String(err)
            }`
        );
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`fetch failed after ${MAX_ATTEMPTS} attempts: ${String(lastError)}`);
}
