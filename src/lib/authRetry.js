/**
 * Unified retry helper for auth operations with exponential backoff + jitter.
 * Caps total RETRIES (not successful calls) across all retry loops.
 */

const MAX_AUTH_RETRIES = 6;
const RETRY_WINDOW_MS = 30000;

let retryHistory = [];

function cleanOldRetries() {
  const now = Date.now();
  retryHistory = retryHistory.filter((ts) => now - ts < RETRY_WINDOW_MS);
}

function recordRetry() {
  cleanOldRetries();
  retryHistory.push(Date.now());
}

function getRecentRetries() {
  cleanOldRetries();
  return retryHistory.length;
}

export function resetAuthAttempts() {
  retryHistory = [];
}

export function isAuthAbortedError(error) {
  const m = (error?.message || String(error || '')).toLowerCase();
  return m.includes('abort') || m.includes('without a reason');
}

export async function withRetry(asyncFn, options = {}) {
  const {
    maxAttempts = 3,
    baseDelayMs = 400,
    skipAbortRetry = false,
  } = options;

  let lastError = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await asyncFn();
    } catch (error) {
      lastError = error;

      if (skipAbortRetry && isAuthAbortedError(error)) {
        throw error;
      }

      if (!isAuthAbortedError(error)) {
        throw error;
      }

      if (getRecentRetries() >= MAX_AUTH_RETRIES) {
        throw new Error(
          'Trop de tentatives de connexion. Attendez 30 secondes et réessayez.'
        );
      }

      recordRetry();

      if (attempt >= maxAttempts - 1) {
        throw error;
      }

      const exponentialDelay = baseDelayMs * Math.pow(2, attempt);
      const jitter = 0.8 + Math.random() * 0.4;
      const delay = Math.floor(exponentialDelay * jitter);

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

export function sleepMs(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
