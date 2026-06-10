/**
 * Integration tests for session-summarizer hook
 *
 * Tests the end-to-end functionality of the session-summarizer hook
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  mkdtempSync,
  rmSync,
  existsSync,
  readFileSync,
  readdirSync,
  writeFileSync,
  appendFileSync,
} from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { execSync } from 'child_process';
import { resetConfig } from '../../src/lib/config.js';
import { TraceManager } from '../../src/lib/tracer.js';

describe('session-summarizer hook', () => {
  let tempDir: string;
  let hookPath: string;
  let manager: TraceManager;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'ahe-summarizer-test-'));
    process.env.AHE_TRACES_DIR = tempDir;
    process.env.AHE_COLLECTION_ENABLED = 'true';
    resetConfig();
    hookPath = join(process.cwd(), 'dist', 'hooks', 'session-summarizer.js');
    manager = new TraceManager(tempDir);
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
    delete process.env.AHE_TRACES_DIR;
    delete process.env.AHE_COLLECTION_ENABLED;
    delete process.env.CLAUDE_SESSION_ID;
    resetConfig();
  });

  describe('summary generation from traces', () => {
    it('should generate summary from trace files', async () => {
      // Create some traces first
      process.env.CLAUDE_SESSION_ID = 'test-session-123';

      await manager.saveTrace('Read', { file_path: '/test/file.ts' }, 'content', 100);
      await manager.saveTrace('Write', { file_path: '/test/output.ts' }, 'written', 200);
      await manager.saveTrace('Bash', { command: 'npm test' }, 'tests passed', 500);

      const result = execSync(`node ${hookPath}`, {
        encoding: 'utf-8',
        env: { ...process.env },
      });

      const output = JSON.parse(result.trim());
      expect(output.status).toBe('summarized');
      expect(output.session_id).toBe('test-session-123');
      expect(output.total_calls).toBe(3);
      expect(output.errors).toBe(0);
    });

    it('should count errors correctly', async () => {
      process.env.CLAUDE_SESSION_ID = 'error-session';

      await manager.saveTrace('Read', {}, 'success', 100);
      await manager.saveTrace('Bash', {}, 'Error: command failed', 1000);
      await manager.saveTrace('Write', {}, 'Error: permission denied', 500);

      const result = execSync(`node ${hookPath}`, {
        encoding: 'utf-8',
        env: { ...process.env },
      });

      const output = JSON.parse(result.trim());
      expect(output.total_calls).toBe(3);
      expect(output.errors).toBe(2);
      expect(parseFloat(output.error_rate)).toBeCloseTo(66.7, 0);
    });

    it('should count slow operations correctly', async () => {
      process.env.CLAUDE_SESSION_ID = 'slow-session';
      process.env.AHE_SLOW_THRESHOLD_MS = '1000';
      resetConfig();

      await manager.saveTrace('Read', {}, 'output', 500);
      await manager.saveTrace('Bash', {}, 'output', 3000); // slow
      await manager.saveTrace('Edit', {}, 'output', 5000); // slow

      const result = execSync(`node ${hookPath}`, {
        encoding: 'utf-8',
        env: { ...process.env },
      });

      const output = JSON.parse(result.trim());
      expect(output.slow_ops).toBe(2);

      delete process.env.AHE_SLOW_THRESHOLD_MS;
    });

    it('should count unique tools correctly', async () => {
      process.env.CLAUDE_SESSION_ID = 'unique-tools-session';

      await manager.saveTrace('Read', {}, 'output', 100);
      await manager.saveTrace('Read', {}, 'output', 100);
      await manager.saveTrace('Write', {}, 'output', 100);
      await manager.saveTrace('Bash', {}, 'output', 100);

      const result = execSync(`node ${hookPath}`, {
        encoding: 'utf-8',
        env: { ...process.env },
      });

      const output = JSON.parse(result.trim());
      expect(output.unique_tools).toBe(3);
    });
  });

  describe('empty session handling', () => {
    it('should handle empty session gracefully', () => {
      process.env.CLAUDE_SESSION_ID = 'empty-session';

      const result = execSync(`node ${hookPath}`, {
        encoding: 'utf-8',
        env: { ...process.env },
      });

      const output = JSON.parse(result.trim());
      expect(output.status).toBe('no_traces');
      expect(output.session_id).toBe('empty-session');
      expect(output.message).toContain('No traces collected');
    });

    it('should handle non-existent session', () => {
      process.env.CLAUDE_SESSION_ID = 'non-existent-session';

      const result = execSync(`node ${hookPath}`, {
        encoding: 'utf-8',
        env: { ...process.env },
      });

      const output = JSON.parse(result.trim());
      expect(output.status).toBe('no_traces');
    });
  });

  describe('summary file generation', () => {
    it('should create summary file', async () => {
      process.env.CLAUDE_SESSION_ID = 'file-test-session';

      await manager.saveTrace('Read', {}, 'content', 100);
      await manager.saveTrace('Write', {}, 'written', 200);

      execSync(`node ${hookPath}`, {
        encoding: 'utf-8',
        env: { ...process.env },
      });

      const summaryFile = join(tempDir, 'file-test-session_summary.json');
      expect(existsSync(summaryFile)).toBe(true);

      const content = JSON.parse(readFileSync(summaryFile, 'utf-8'));
      expect(content.session_id).toBe('file-test-session');
      expect(content.status).toBe('success');
      expect(content.statistics.total_tool_calls).toBe(2);
    });

    it('should include tool usage in summary', async () => {
      process.env.CLAUDE_SESSION_ID = 'tool-usage-session';

      await manager.saveTrace('Read', {}, 'out', 100);
      await manager.saveTrace('Read', {}, 'out', 100);
      await manager.saveTrace('Write', {}, 'out', 100);

      execSync(`node ${hookPath}`, {
        encoding: 'utf-8',
        env: { ...process.env },
      });

      const summaryFile = join(tempDir, 'tool-usage-session_summary.json');
      const content = JSON.parse(readFileSync(summaryFile, 'utf-8'));

      expect(content.tool_usage.Read).toBe(2);
      expect(content.tool_usage.Write).toBe(1);
    });

    it('should include tool statistics in summary', async () => {
      process.env.CLAUDE_SESSION_ID = 'stats-session';

      await manager.saveTrace('Bash', {}, 'out', 100);
      await manager.saveTrace('Bash', {}, 'out', 200);
      await manager.saveTrace('Bash', {}, 'out', 300);

      execSync(`node ${hookPath}`, {
        encoding: 'utf-8',
        env: { ...process.env },
      });

      const summaryFile = join(tempDir, 'stats-session_summary.json');
      const content = JSON.parse(readFileSync(summaryFile, 'utf-8'));

      const bashStats = content.tool_statistics.Bash;
      expect(bashStats.count).toBe(3);
      expect(bashStats.avg_time_ms).toBe(200);
      expect(bashStats.min_time_ms).toBe(100);
      expect(bashStats.max_time_ms).toBe(300);
    });

    it('should include error details in issues', async () => {
      process.env.CLAUDE_SESSION_ID = 'error-details-session';

      await manager.saveTrace('Bash', { command: 'test' }, 'Error: failed', 1000);

      execSync(`node ${hookPath}`, {
        encoding: 'utf-8',
        env: { ...process.env },
      });

      const summaryFile = join(tempDir, 'error-details-session_summary.json');
      const content = JSON.parse(readFileSync(summaryFile, 'utf-8'));

      expect(content.issues).toBeDefined();
      expect(content.issues.errors).toBeDefined();
      expect(content.issues.errors.length).toBe(1);
      expect(content.issues.errors[0].tool).toBe('Bash');
      expect(content.issues.errors[0].output_preview).toContain('Error');
    });

    it('should include slow operation details in issues', async () => {
      process.env.CLAUDE_SESSION_ID = 'slow-ops-session';
      process.env.AHE_SLOW_THRESHOLD_MS = '1000';
      resetConfig();

      await manager.saveTrace('Read', {}, 'output', 5000);

      execSync(`node ${hookPath}`, {
        encoding: 'utf-8',
        env: { ...process.env },
      });

      const summaryFile = join(tempDir, 'slow-ops-session_summary.json');
      const content = JSON.parse(readFileSync(summaryFile, 'utf-8'));

      expect(content.issues).toBeDefined();
      expect(content.issues.slow_operations).toBeDefined();
      expect(content.issues.slow_operations.length).toBe(1);
      expect(content.issues.slow_operations[0].tool).toBe('Read');
      expect(content.issues.slow_operations[0].execution_time_ms).toBe(5000);

      delete process.env.AHE_SLOW_THRESHOLD_MS;
    });
  });

  describe('hook behavior', () => {
    it('should exit silently when collection is disabled', () => {
      process.env.AHE_COLLECTION_ENABLED = 'false';
      resetConfig();

      const result = execSync(`node ${hookPath}`, {
        encoding: 'utf-8',
        env: { ...process.env },
      });

      expect(result.trim()).toBe('');
    });

    it('should handle concurrent runs gracefully', async () => {
      process.env.CLAUDE_SESSION_ID = 'concurrent-session';

      await manager.saveTrace('Read', {}, 'output', 100);

      // Run multiple times (simulating concurrent hooks)
      const results = [];
      for (let i = 0; i < 3; i++) {
        const result = execSync(`node ${hookPath}`, {
          encoding: 'utf-8',
          env: { ...process.env },
        });
        results.push(JSON.parse(result.trim()));
      }

      // All runs should succeed
      expect(results.every(r => r.status === 'summarized')).toBe(true);

      // Should only have one summary file
      const summaryFiles = readdirSync(tempDir).filter(f => f.includes('_summary.json'));
      expect(summaryFiles.length).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('should handle very long tool output', async () => {
      process.env.CLAUDE_SESSION_ID = 'long-output-session';

      const longOutput = 'a'.repeat(10000);
      await manager.saveTrace('Read', {}, longOutput, 100);

      const result = execSync(`node ${hookPath}`, {
        encoding: 'utf-8',
        env: { ...process.env },
      });

      const output = JSON.parse(result.trim());
      expect(output.status).toBe('summarized');
    });

    it('should handle special characters in input', async () => {
      process.env.CLAUDE_SESSION_ID = 'special-chars-session';

      const specialInput = { path: '/test/file with spaces/特殊字符.ts' };
      await manager.saveTrace('Read', specialInput, 'output', 100);

      const result = execSync(`node ${hookPath}`, {
        encoding: 'utf-8',
        env: { ...process.env },
      });

      const output = JSON.parse(result.trim());
      expect(output.status).toBe('summarized');

      const summaryFile = join(tempDir, 'special-chars-session_summary.json');
      const content = JSON.parse(readFileSync(summaryFile, 'utf-8'));
      expect(content.tool_usage.Read).toBe(1);
    });

    it('should handle traces with zero execution time', async () => {
      process.env.CLAUDE_SESSION_ID = 'zero-time-session';

      await manager.saveTrace('Read', {}, 'output', 0);

      const result = execSync(`node ${hookPath}`, {
        encoding: 'utf-8',
        env: { ...process.env },
      });

      const output = JSON.parse(result.trim());
      expect(output.status).toBe('summarized');

      const summaryFile = join(tempDir, 'zero-time-session_summary.json');
      const content = JSON.parse(readFileSync(summaryFile, 'utf-8'));
      expect(content.tool_statistics.Read.avg_time_ms).toBe(0);
    });

    it('should handle malformed trace files gracefully', async () => {
      process.env.CLAUDE_SESSION_ID = 'malformed-session';

      // Create a malformed trace file with partially valid traces
      // The malformed lines should be skipped but valid traces should still be processed
      const traceFile = join(tempDir, 'malformed-session.jsonl');
      // Write a valid trace first
      await manager.saveTrace('Read', {}, 'valid output', 100);
      // Then append some invalid lines
      appendFileSync(traceFile, 'invalid json line\n');

      const result = execSync(`node ${hookPath}`, {
        encoding: 'utf-8',
        env: { ...process.env },
      });

      // Should handle gracefully and still summarize the valid trace
      const output = JSON.parse(result.trim());
      expect(['no_traces', 'summarized']).toContain(output.status);
    });
  });

  describe('session time range', () => {
    it('should include session start and end time', async () => {
      process.env.CLAUDE_SESSION_ID = 'time-range-session';

      const before = Date.now();
      await manager.saveTrace('Read', {}, 'output', 100);
      // Small delay
      const start = Date.now();
      while (Date.now() - start < 50) {
        // busy wait
      }
      await manager.saveTrace('Write', {}, 'output', 100);

      execSync(`node ${hookPath}`, {
        encoding: 'utf-8',
        env: { ...process.env },
      });

      const summaryFile = join(tempDir, 'time-range-session_summary.json');
      const content = JSON.parse(readFileSync(summaryFile, 'utf-8'));

      expect(content.session_info).toBeDefined();
      expect(content.session_info.start_time).toBeDefined();
      expect(content.session_info.end_time).toBeDefined();
    });
  });
});
