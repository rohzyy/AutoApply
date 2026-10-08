export interface RetryOptions {
  attempts?: number;
  baseMs?: number;
  maxMs?: number;
  retryIf?: (err: unknown) => boolean;
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Exponential backoff with full jitter. */
export function backoffMs(attempt: number, baseMs = 500, maxMs = 30_000) {
  const exp = Math.min(maxMs, baseMs * 2 ** attempt);
  return Math.round(Math.random() * exp);
}

export async function withRetry<T>(fn: (attempt: number) => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const { attempts = 3, baseMs = 300, maxMs = 5_000, retryIf = () => true } = opts;
  let lastErr: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastErr = err;
      if (attempt === attempts - 1 || !retryIf(err)) break;
      await sleep(backoffMs(attempt, baseMs, maxMs));
    }
  }
  throw lastErr;
}
