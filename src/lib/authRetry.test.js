import { describe, it, expect, beforeEach, vi } from 'vitest';
import { withRetry, resetAuthAttempts, isAuthAbortedError } from './authRetry';

describe('authRetry', () => {
  beforeEach(() => {
    resetAuthAttempts();
  });

  describe('isAuthAbortedError', () => {
    it('should detect abort errors', () => {
      expect(isAuthAbortedError(new Error('Request aborted'))).toBe(true);
      expect(isAuthAbortedError(new Error('Failed without a reason'))).toBe(true);
      expect(isAuthAbortedError(new Error('ABORT signal'))).toBe(true);
    });

    it('should not detect non-abort errors', () => {
      expect(isAuthAbortedError(new Error('Invalid credentials'))).toBe(false);
      expect(isAuthAbortedError(new Error('Network error'))).toBe(false);
      expect(isAuthAbortedError(null)).toBe(false);
    });
  });

  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      const result = await withRetry(fn);
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on abort error and succeed', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('Request aborted'))
        .mockResolvedValueOnce('success');
      
      const result = await withRetry(fn, { maxAttempts: 3 });
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should not retry non-abort errors', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Invalid credentials'));
      
      await expect(withRetry(fn)).rejects.toThrow('Invalid credentials');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should throw after max attempts', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Request aborted'));
      
      await expect(withRetry(fn, { maxAttempts: 2 })).rejects.toThrow('Request aborted');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should enforce global attempt cap', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Request aborted'));
      
      // Try to exceed global cap (6 attempts)
      for (let i = 0; i < 7; i++) {
        try {
          await withRetry(fn, { maxAttempts: 1 });
        } catch (e) {
          if (e.message.includes('Trop de tentatives')) {
            expect(i).toBeGreaterThanOrEqual(5); // Should hit cap around 6th attempt
            return;
          }
        }
      }
      
      // If we got here without hitting the cap, fail
      expect.fail('Should have hit global attempt cap');
    });

    it('should reset attempt counter', async () => {
      const fn1 = vi.fn().mockRejectedValue(new Error('Request aborted'));
      const fn2 = vi.fn().mockResolvedValue('success');
      
      // Use up some attempts
      try {
        await withRetry(fn1, { maxAttempts: 3 });
      } catch {
        // Expected to fail
      }
      
      // Reset
      resetAuthAttempts();
      
      // Should be able to make new attempts
      const result = await withRetry(fn2, { maxAttempts: 3 });
      expect(result).toBe('success');
    });

    it('should apply exponential backoff with jitter', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('Request aborted'))
        .mockRejectedValueOnce(new Error('Request aborted'))
        .mockResolvedValueOnce('success');
      
      const start = Date.now();
      await withRetry(fn, { maxAttempts: 3, baseDelayMs: 100 });
      const elapsed = Date.now() - start;
      
      // Should have at least base delay * 2 attempts with jitter (roughly 100ms + 200ms)
      // With jitter factor 0.8-1.2, minimum is ~240ms
      expect(elapsed).toBeGreaterThan(200);
      expect(fn).toHaveBeenCalledTimes(3);
    });
  });
});
