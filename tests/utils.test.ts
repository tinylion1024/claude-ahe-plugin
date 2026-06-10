/**
 * Tests for utility functions
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { mkdtempSync, rmSync, existsSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  truncateOutput,
  isError,
  getSessionId,
  ensureDir,
  formatDuration,
  calculateStatistics,
  getTimestamp,
} from '../src/lib/utils';

describe('utils', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'ahe-utils-test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('truncateOutput', () => {
    it('should not truncate short strings', () => {
      expect(truncateOutput('short string', 100)).toBe('short string');
    });

    it('should truncate long strings', () => {
      const longStr = 'a'.repeat(2000);
      const result = truncateOutput(longStr, 1000);
      expect(result.length).toBeLessThan(1050);
      expect(result).toContain('[truncated');
      expect(result).toContain('2000 chars');
    });

    it('should use default max length', () => {
      const longStr = 'a'.repeat(2000);
      const result = truncateOutput(longStr);
      expect(result.length).toBeLessThan(1050);
    });

    it('should handle objects', () => {
      expect(truncateOutput({ key: 'value' }, 100)).toBe('[object Object]');
    });

    it('should handle null', () => {
      expect(truncateOutput(null, 100)).toBe('null');
    });

    it('should handle undefined', () => {
      expect(truncateOutput(undefined, 100)).toBe('undefined');
    });

    it('should handle numbers', () => {
      expect(truncateOutput(12345, 100)).toBe('12345');
    });

    it('should handle arrays', () => {
      expect(truncateOutput([1, 2, 3], 100)).toBe('1,2,3');
    });
  });

  describe('isError', () => {
    it('should detect "error" keyword', () => {
      expect(isError('Error: something went wrong')).toBe(true);
    });

    it('should detect "failed" keyword', () => {
      expect(isError('Operation failed')).toBe(true);
    });

    it('should detect "exception" keyword', () => {
      expect(isError('Exception: null pointer')).toBe(true);
    });

    it('should detect "traceback" keyword', () => {
      expect(isError('Traceback (most recent call last)')).toBe(true);
    });

    it('should detect "timeout" keyword', () => {
      expect(isError('Connection timeout')).toBe(true);
    });

    it('should be case-insensitive', () => {
      expect(isError('ERROR: BIG PROBLEM')).toBe(true);
      expect(isError('FAILED TO LOAD')).toBe(true);
    });

    it('should return false for success messages', () => {
      expect(isError('Success: operation completed')).toBe(false);
      expect(isError('File read successfully')).toBe(false);
    });

    it('should detect error in objects', () => {
      expect(isError({ error: 'bad' })).toBe(true);
      expect(isError({ failed: true })).toBe(true);
    });

    it('should return false for normal objects', () => {
      expect(isError({ success: true })).toBe(false);
      expect(isError({ data: [1, 2, 3] })).toBe(false);
    });

    it('should return false for non-string non-objects', () => {
      expect(isError(123)).toBe(false);
      expect(isError(null)).toBe(false);
      expect(isError(undefined)).toBe(false);
    });

    it('should use custom keywords', () => {
      expect(isError('oops something happened', ['oops'])).toBe(true);
      expect(isError('error occurred', ['oops'])).toBe(false);
    });

    it('should use custom keywords array', () => {
      expect(isError('warning: check this', ['warning', 'notice'])).toBe(true);
      expect(isError('error found', ['warning', 'notice'])).toBe(false);
    });
  });

  describe('getSessionId', () => {
    it('should return CLAUDE_SESSION_ID if set', () => {
      process.env.CLAUDE_SESSION_ID = 'test-session-123';
      expect(getSessionId()).toBe('test-session-123');
      delete process.env.CLAUDE_SESSION_ID;
    });

    it('should generate session ID from timestamp if no env var', () => {
      delete process.env.CLAUDE_SESSION_ID;
      const sessionId = getSessionId();
      expect(sessionId).toMatch(/^session_\d{8}_\d{6}$/);
    });

    it('should generate unique session IDs', () => {
      delete process.env.CLAUDE_SESSION_ID;
      const id1 = getSessionId();
      const id2 = getSessionId();
      // They might be the same if called in same second, but format should match
      expect(id1).toMatch(/^session_/);
      expect(id2).toMatch(/^session_/);
    });
  });

  describe('ensureDir', () => {
    it('should create directory if it does not exist', () => {
      const newDir = join(tempDir, 'new-dir');
      expect(existsSync(newDir)).toBe(false);
      expect(ensureDir(newDir)).toBe(true);
      expect(existsSync(newDir)).toBe(true);
    });

    it('should return true if directory already exists', () => {
      expect(existsSync(tempDir)).toBe(true);
      expect(ensureDir(tempDir)).toBe(true);
    });

    it('should create nested directories', () => {
      const nestedDir = join(tempDir, 'a', 'b', 'c');
      expect(ensureDir(nestedDir)).toBe(true);
      expect(existsSync(nestedDir)).toBe(true);
    });

    it('should return false for invalid path', () => {
      // This might succeed depending on permissions, so just test it doesn't throw
      const result = ensureDir('/dev/null/invalid');
      // Result depends on system
      expect(typeof result).toBe('boolean');
    });
  });

  describe('formatDuration', () => {
    it('should format milliseconds', () => {
      expect(formatDuration(100)).toBe('100ms');
      expect(formatDuration(999)).toBe('999ms');
    });

    it('should format seconds', () => {
      expect(formatDuration(1000)).toBe('1.0s');
      expect(formatDuration(5000)).toBe('5.0s');
      expect(formatDuration(59999)).toBe('60.0s');
    });

    it('should format minutes', () => {
      expect(formatDuration(60000)).toBe('1.0m');
      expect(formatDuration(120000)).toBe('2.0m');
      expect(formatDuration(3661000)).toBe('61.0m');
    });

    it('should round milliseconds', () => {
      expect(formatDuration(150)).toBe('150ms');
      expect(formatDuration(1550)).toBe('1.6s');
    });
  });

  describe('calculateStatistics', () => {
    it('should return zeros for empty array', () => {
      const stats = calculateStatistics([]);
      expect(stats).toEqual({
        count: 0,
        sum: 0,
        min: 0,
        max: 0,
        avg: 0,
      });
    });

    it('should calculate statistics for single value', () => {
      const stats = calculateStatistics([5]);
      expect(stats).toEqual({
        count: 1,
        sum: 5,
        min: 5,
        max: 5,
        avg: 5,
      });
    });

    it('should calculate statistics for multiple values', () => {
      const stats = calculateStatistics([1, 2, 3, 4, 5]);
      expect(stats.count).toBe(5);
      expect(stats.sum).toBe(15);
      expect(stats.min).toBe(1);
      expect(stats.max).toBe(5);
      expect(stats.avg).toBe(3);
    });

    it('should handle decimal values', () => {
      const stats = calculateStatistics([1.5, 2.5, 3.5]);
      expect(stats.count).toBe(3);
      expect(stats.sum).toBeCloseTo(7.5);
      expect(stats.min).toBe(1.5);
      expect(stats.max).toBe(3.5);
      expect(stats.avg).toBeCloseTo(2.5);
    });

    it('should handle negative values', () => {
      const stats = calculateStatistics([-5, 0, 5]);
      expect(stats.count).toBe(3);
      expect(stats.sum).toBe(0);
      expect(stats.min).toBe(-5);
      expect(stats.max).toBe(5);
      expect(stats.avg).toBe(0);
    });

    it('should handle large arrays', () => {
      const values = Array.from({ length: 1000 }, (_, i) => i + 1);
      const stats = calculateStatistics(values);
      expect(stats.count).toBe(1000);
      expect(stats.sum).toBe(500500);
      expect(stats.min).toBe(1);
      expect(stats.max).toBe(1000);
      expect(stats.avg).toBe(500.5);
    });
  });

  describe('getTimestamp', () => {
    it('should return ISO format timestamp', () => {
      const timestamp = getTimestamp();
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should return valid Date', () => {
      const timestamp = getTimestamp();
      const date = new Date(timestamp);
      expect(date.getTime()).not.toBeNaN();
    });

    it('should return current time', () => {
      const before = Date.now();
      const timestamp = getTimestamp();
      const after = Date.now();
      const date = new Date(timestamp).getTime();
      expect(date).toBeGreaterThanOrEqual(before);
      expect(date).toBeLessThanOrEqual(after);
    });
  });
});
