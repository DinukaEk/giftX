export const TIMEOUT_MESSAGE = "This is taking too long. Check your connection and try again.";
const NETWORK_ERROR_MESSAGE = "Couldn't connect. Check your internet connection and try again.";

/** Supabase resolves with an error object (rather than throwing) when a
 *  request is aborted, and that object's message contains the word "abort" —
 *  this turns that into a message a user can actually act on. A network
 *  failure that isn't a timeout (blocked domain, offline, CORS, DNS) usually
 *  surfaces as a raw "TypeError: Failed to fetch" — just as unhelpful shown
 *  verbatim, so that gets its own friendly message too. */
export function friendlyError(message: string | null | undefined): string {
  if (!message) return "Something went wrong.";
  if (/abort/i.test(message)) return TIMEOUT_MESSAGE;
  if (/failed to fetch|networkerror|load failed/i.test(message)) return NETWORK_ERROR_MESSAGE;
  return message;
}

/**
 * A hung request (bad connection, blocked domain, etc.) should surface as an
 * error, not leave the UI stuck on a loading state forever. Pass the
 * returned `signal` to `.abortSignal()` on a Supabase query, and call
 * `clear()` once the request settles (in a `finally` block).
 */
export function createTimeoutSignal(ms = 15000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);
  return {
    signal: controller.signal,
    controller,
    clear: () => clearTimeout(timeoutId),
  };
}

/**
 * For calls that can't take an .abortSignal() (e.g. Supabase Storage
 * uploads) — races the given promise against a timeout so it still can't
 * hang the UI forever. Doesn't cancel the underlying request, just stops
 * waiting on it.
 */
export function withTimeout<T>(promise: Promise<T>, ms = 15000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(TIMEOUT_MESSAGE)), ms)),
  ]);
}