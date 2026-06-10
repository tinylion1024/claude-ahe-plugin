/**
 * Tests for TraceManager
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { TraceManager } from '../src/lib/tracer';
import { resetConfig } from '../src/lib/config';

describe('TraceManager', () => {
  let tempDir: string;
  let manager: TraceManager;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'ahe-test-'));
    // Reset config to use temp directory
    process.env.AHE_TRACES_DIR = tempDir;
    resetConfig();
    manager = new TraceManager(tempDir);
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
    delete process.env.AHE_TRACES_DIR;
    resetConfig();
  });

  describe('saveTrace', () => {
    it('should save a trace and return TraceData', async () => {
      const trace = await manager.saveTrace(
        'Read',
        { file_path: '/test/file.ts' },
        'file content',
        150,
        'session-123'
      );

      expect(trace.tool.name).toBe('Read');
      expect(trace.tool.execution_time_ms).toBe(150);
      expect(trace.session_id).toBe('session-123');
      expect(trace.context.success).toBe(true);
    });

    it('should detect errors from output', async () => {
      const trace = await manager.saveTrace(
        'Bash',
        { command: 'npm test' },
        'Error: Tests failed',
        5000,
        'session-123'
      );

      expect(trace.context.success).toBe(false);
    });

    it('should persist trace to file', async () => {
      await manager.saveTrace('Read', {}, 'output', 100, 'session-123');

      const traces = await manager.loadTraces('session-123');
      expect(traces.length).toBe(1);
      expect(traces[0].tool.name).toBe('Read');
    });

    it('should use custom truncate length', async () => {
      const longOutput = 'a'.repeat(2000);
      const trace = await manager.saveTrace(
        'Read',
        {},
        longOutput,
        100,
        'session-123',
        undefined,
        500
      );

      expect(trace.tool.output.length).toBeLessThan(550);
    });
  });

  describe('loadTraces', () => {
    it('should return empty array when no traces exist', async () => {
      const traces = await manager.loadTraces();
      expect(traces).toEqual([]);
    });

    it('should load traces for specific session', async () => {
      await manager.saveTrace('Read', {}, 'out1', 100, 'session-1');
      await manager.saveTrace('Write', {}, 'out2', 200, 'session-2');
      await manager.saveTrace('Edit', {}, 'out3', 300, 'session-1');

      const traces = await manager.loadTraces('session-1');
      expect(traces.length).toBe(2);
    });

    it('should load from last N trace files', async () => {
      // Create traces in different sessions (different files)
      for (let i = 0; i < 10; i++) {
        await manager.saveTrace('Read', {}, `out${i}`, 100, `session-${i}`);
      }

      const traces = await manager.loadTraces(undefined, 5);
      // lastN limits the number of FILES, not traces
      expect(traces.length).toBe(5);
    });

    it('should filter traces by date', async () => {
      await manager.saveTrace('Read', {}, 'out1', 100, 'session-1');
      await manager.saveTrace('Write', {}, 'out2', 200, 'session-2');

      const futureDate = new Date(Date.now() + 10000);
      const traces = await manager.loadTraces(undefined, undefined, futureDate);
      expect(traces.length).toBe(0);
    });
  });

  describe('loadSummaries', () => {
    it('should return empty array when no summaries exist', async () => {
      const summaries = await manager.loadSummaries();
      expect(summaries).toEqual([]);
    });

    it('should load generated summary', async () => {
      await manager.saveTrace('Read', {}, 'output', 100, 'session-123');
      await manager.generateSessionSummary('session-123');

      const summaries = await manager.loadSummaries('session-123');
      expect(summaries.length).toBe(1);
      expect(summaries[0].session_id).toBe('session-123');
    });
  });

  describe('generateSessionSummary', () => {
    it('should generate summary with correct statistics', async () => {
      await manager.saveTrace('Read', {}, 'output', 100, 'session-123');
      await manager.saveTrace('Bash', {}, 'Error: failed', 6000, 'session-123'); // Error + Slow (over 5000ms)
      await manager.saveTrace('Write', {}, 'output', 6000, 'session-123'); // Slow (over 5000ms)

      const summary = await manager.generateSessionSummary('session-123');

      expect(summary.session_id).toBe('session-123');
      expect(summary.statistics.total_tool_calls).toBe(3);
      expect(summary.statistics.error_count).toBe(1);
      expect(summary.statistics.slow_operation_count).toBe(2);
      expect(Object.keys(summary.tool_usage)).toContain('Read');
      expect(Object.keys(summary.tool_usage)).toContain('Bash');
      expect(Object.keys(summary.tool_usage)).toContain('Write');
    });

    it('should return no_traces status for empty session', async () => {
      const summary = await manager.generateSessionSummary('empty-session');
      expect(summary.status).toBe('no_traces');
      expect(summary.statistics.total_tool_calls).toBe(0);
    });

    it('should save summary to file', async () => {
      await manager.saveTrace('Read', {}, 'output', 100, 'session-123');
      await manager.generateSessionSummary('session-123');

      const summaryFile = join(tempDir, 'session-123_summary.json');
      expect(existsSync(summaryFile)).toBe(true);

      const content = JSON.parse(readFileSync(summaryFile, 'utf-8'));
      expect(content.session_id).toBe('session-123');
    });
  });

  describe('cleanupOldTraces', () => {
    it('should remove old traces based on count', async () => {
      // Create some traces
      await manager.saveTrace('Read', {}, 'out', 100, 'session-1');

      // Cleanup with max 0 (should remove all)
      const removed = await manager.cleanupOldTraces(0);

      expect(removed).toBeGreaterThanOrEqual(1);
      const traces = await manager.loadTraces();
      expect(traces.length).toBe(0);
    });

    it('should remove corresponding summary files', async () => {
      await manager.saveTrace('Read', {}, 'output', 100, 'session-123');
      await manager.generateSessionSummary('session-123');

      const summaryFile = join(tempDir, 'session-123_summary.json');
      expect(existsSync(summaryFile)).toBe(true);

      await manager.cleanupOldTraces(0);

      expect(existsSync(summaryFile)).toBe(false);
    });
  });
});
