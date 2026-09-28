/**
 * Unified retry helper for auth operations with exponential backoff + jitter.
 * Caps total attempts across all retry loops to prevent auth pile-up.
 */

const MAX_TOTAL_ATTEMPTS = 6;
const ATTEMPT_WINDOW_MS = 30000; // 30s window for counting attempts

let attemptHistory = [];

function cleanOldAttempts() {
  const now = Date.now();
  attemptHistory = attemptHistory.filter((ts) => now - ts < ATTEMPT_WINDOW_MS);
}

function recordAttempt() {
  cleanOldAttempts();
  attemptHistory.push(Date.now());
}

function getTotalAttempts() {
  cleanOldAttempts();
  return attemptHistory.length;
}

/**
 * Reset attempt counter (call on successful auth or explicit sign-out).
 */
export function resetAuthAttempts() {
  attemptHistory = [];
}

/**
 * Check if an error is an auth abort (Safari/mobile common issue).
 */
export function isAuthAbortedError(error) {
  const m = (error?.message || String(error || '')).toLowerCase();
  return m.includes('abort') || m.includes('without a reason');
}

/**
 * Retry an async operation with exponential backoff + jitter.
 * 
 * @param {Function} asyncFn - The async function to retry
 * @param {Object} options
 * @param {number} options.maxAttempts - Max attempts for this call (default 3)
 * @param {number} options.baseDelayMs - Base delay in ms (default 400)
 * @param {boolean} options.skipAbortRetry - Don't retry on abort errors (default false)
 * @returns {Promise<any>}
 */
export async function withRetry(asyncFn, options = {}) {
  const {
    maxAttempts = 3,
    baseDelayMs = 400,
    skipAbortRetry = false,
  } = options;

  let lastError = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Check global attempt cap
    if (getTotalAttempts() >= MAX_TOTAL_ATTEMPTS) {
      throw new Error(
        'Trop de tentatives de connexion. Attendez 30 secondes et réessayez.'
      );
    }

    recordAttempt();

    try {
      return await asyncFn();
    } catch (error) {
      lastError = error;

      // If abort error and skipAbortRetry is true, throw immediately
      if (skipAbortRetry && isAuthAbortedError(error)) {
        throw error;
      }

      // If not an abort error, don't retry (e.g., invalid credentials)
      if (!isAuthAbortedError(error)) {
        throw error;
      }

      // Last attempt, throw
      if (attempt >= maxAttempts - 1) {
        throw error;
      }

      // Exponential backoff with jitter: delay = base * 2^attempt * (0.8 + random * 0.4)
      const exponentialDelay = baseDelayMs * Math.pow(2, attempt);
      const jitter = 0.8 + Math.random() * 0.4;
      const delay = Math.floor(exponentialDelay * jitter);

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Sleep utility (for explicit waits, not retries).
 */
export function sleepMs(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
