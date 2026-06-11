/**
 * Integration tests for trace-collector hook
 *
 * Tests the end-to-end functionality of the trace-collector hook
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { mkdtempSync, rmSync, existsSync, readFileSync, readdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { execSync } from 'child_process';
import { resetConfig } from '../../src/lib/config.js';

describe('trace-collector hook', () => {
  let tempDir: string;
  let hookPath: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'ahe-trace-collector-test-'));
    process.env.AHE_TRACES_DIR = tempDir;
    process.env.AHE_COLLECTION_ENABLED = 'true';
    resetConfig();
    hookPath = join(process.cwd(), 'dist', 'hooks', 'trace-collector.js');
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
    delete process.env.AHE_TRACES_DIR;
    delete process.env.AHE_COLLECTION_ENABLED;
    resetConfig();
  });

  describe('JSON input parsing and validation', () => {
    it('should parse valid JSON input and save trace', () => {
      const input = JSON.stringify({
        tool_name: 'Read',
        tool_input: { file_path: '/test/file.ts' },
        tool_output: 'file content here',
        execution_time_ms: 150,
        working_directory: '/project',
      });

      const result = execSync(`echo '${input}' | node ${hookPath}`, {
        encoding: 'utf-8',
        env: { ...process.env },
      });

      const output = JSON.parse(result.trim());
      expect(output.status).toBe('collected');
      expect(output.session_id).toBeDefined();
      expect(output.trace_id).toBeDefined();
    });

    it('should reject invalid JSON input', () => {
      const input = 'not valid json';

      try {
        execSync(`echo '${input}' | node ${hookPath}`, {
          encoding: 'utf-8',
          env: { ...process.env },
          stdio: 'pipe',
        });
        // Should not reach here
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.status).toBe(1);
        expect(error.stderr).toContain('Invalid JSON');
      }
    });

    it('should normalize missing fields with defaults', () => {
      const input = JSON.stringify({
        tool_name: 'Read',
        // missing tool_input, tool_output, execution_time_ms
      });

      // With field normalization, missing fields get defaults instead of error
      const result = execSync(`echo '${input}' | node ${hookPath}`, {
        encoding: 'utf-8',
        env: { ...process.env },
      });

      const output = JSON.parse(result.trim());
      expect(output.status).toBe('collected');

      // Verify the trace has default values
      const files = readdirSync(tempDir).filter(f => f.endsWith('.jsonl'));
      const traceFile = join(tempDir, files[0]);
      const content = readFileSync(traceFile, 'utf-8');
      const trace = JSON.parse(content.trim());

      expect(trace.tool.name).toBe('Read');
      expect(trace.tool.input).toEqual({});
      expect(trace.tool.output).toBe('');
      expect(trace.tool.execution_time_ms).toBe(0);
    });

    it('should normalize empty tool_name to Unknown', () => {
      const input = JSON.stringify({
        tool_name: '',
        tool_input: {},
        tool_output: 'output',
        execution_time_ms: 100,
      });

      // With field normalization, empty tool_name becomes 'Unknown'
      const result = execSync(`echo '${input}' | node ${hookPath}`, {
        encoding: 'utf-8',
        env: { ...process.env },
      });

      const output = JSON.parse(result.trim());
      expect(output.status).toBe('collected');

      // Verify the trace has 'Unknown' as tool name
      const files = readdirSync(tempDir).filter(f => f.endsWith('.jsonl'));
      const traceFile = join(tempDir, files[0]);
      const content = readFileSync(traceFile, 'utf-8');
      const trace = JSON.parse(content.trim());

      expect(trace.tool.name).toBe('Unknown');
    });

    it('should normalize negative execution_time_ms to 0', () => {
      const input = JSON.stringify({
        tool_name: 'Read',
        tool_input: {},
        tool_output: 'output',
        execution_time_ms: -100,
      });

      // With field normalization, negative execution_time_ms becomes 0
      const result = execSync(`echo '${input}' | node ${hookPath}`, {
        encoding: 'utf-8',
        env: { ...process.env },
      });

      const output = JSON.parse(result.trim());
      expect(output.status).toBe('collected');

      // Verify the trace has 0 as execution time
      const files = readdirSync(tempDir).filter(f => f.endsWith('.jsonl'));
      const traceFile = join(tempDir, files[0]);
      const content = readFileSync(traceFile, 'utf-8');
      const trace = JSON.parse(content.trim());

      expect(trace.tool.execution_time_ms).toBe(0);
    });
  });

  describe('trace file generation', () => {
    it('should create trace file in JSONL format', () => {
      const input = JSON.stringify({
        tool_name: 'Read',
        tool_input: { file_path: '/test/file.ts' },
        tool_output: 'file content',
        execution_time_ms: 150,
      });

      execSync(`echo '${input}' | node ${hookPath}`, {
        encoding: 'utf-8',
        env: { ...process.env },
      });

      const files = readdirSync(tempDir).filter(f => f.endsWith('.jsonl'));
      expect(files.length).toBeGreaterThan(0);

      const traceFile = join(tempDir, files[0]);
      const content = readFileSync(traceFile, 'utf-8');
      const lines = content.trim().split('\n');

      expect(lines.length).toBe(1);
      const trace = JSON.parse(lines[0]);
      expect(trace.tool.name).toBe('Read');
      expect(trace.tool.input.file_path).toBe('/test/file.ts');
    });

    it('should append multiple traces to same session file', () => {
      const input1 = JSON.stringify({
        tool_name: 'Read',
        tool_input: { file_path: '/test/file1.ts' },
        tool_output: 'content 1',
        execution_time_ms: 100,
      });

      const input2 = JSON.stringify({
        tool_name: 'Write',
        tool_input: { file_path: '/test/file2.ts' },
        tool_output: 'content 2',
        execution_time_ms: 200,
      });

      // Set a fixed session ID
      process.env.CLAUDE_SESSION_ID = 'test-session-123';

      execSync(`echo '${input1}' | node ${hookPath}`, {
        encoding: 'utf-8',
        env: { ...process.env },
      });

      execSync(`echo '${input2}' | node ${hookPath}`, {
        encoding: 'utf-8',
        env: { ...process.env },
      });

      const traceFile = join(tempDir, 'test-session-123.jsonl');
      expect(existsSync(traceFile)).toBe(true);

      const content = readFileSync(traceFile, 'utf-8');
      const lines = content.trim().split('\n');

      expect(lines.length).toBe(2);

      const trace1 = JSON.parse(lines[0]);
      expect(trace1.tool.name).toBe('Read');

      const trace2 = JSON.parse(lines[1]);
      expect(trace2.tool.name).toBe('Write');

      delete process.env.CLAUDE_SESSION_ID;
    });

    it('should truncate output when exceeding configured length', () => {
      const longOutput = 'a'.repeat(2000);
      const input = JSON.stringify({
        tool_name: 'Read',
        tool_input: {},
        tool_output: longOutput,
        execution_time_ms: 100,
      });

      process.env.AHE_TRUNCATE_CHARS = '500';
      resetConfig();

      execSync(`echo '${input}' | node ${hookPath}`, {
        encoding: 'utf-8',
        env: { ...process.env },
      });

      const files = readdirSync(tempDir).filter(f => f.endsWith('.jsonl'));
      const traceFile = join(tempDir, files[0]);
      const content = readFileSync(traceFile, 'utf-8');
      const trace = JSON.parse(content.trim());

      expect(trace.tool.output.length).toBeLessThan(600); // 500 + truncation message
      expect(trace.tool.output).toContain('[truncated');

      delete process.env.AHE_TRUNCATE_CHARS;
    });

    it('should detect errors in output', () => {
      const input = JSON.stringify({
        tool_name: 'Bash',
        tool_input: { command: 'npm test' },
        tool_output: 'Error: Tests failed',
        execution_time_ms: 5000,
      });

      execSync(`echo '${input}' | node ${hookPath}`, {
        encoding: 'utf-8',
        env: { ...process.env },
      });

      const files = readdirSync(tempDir).filter(f => f.endsWith('.jsonl'));
      const traceFile = join(tempDir, files[0]);
      const content = readFileSync(traceFile, 'utf-8');
      const trace = JSON.parse(content.trim());

      expect(trace.context.success).toBe(false);
    });

    it('should mark successful operations', () => {
      const input = JSON.stringify({
        tool_name: 'Read',
        tool_input: { file_path: '/test/file.ts' },
        tool_output: 'file content loaded successfully',
        execution_time_ms: 100,
      });

      execSync(`echo '${input}' | node ${hookPath}`, {
        encoding: 'utf-8',
        env: { ...process.env },
      });

      const files = readdirSync(tempDir).filter(f => f.endsWith('.jsonl'));
      const traceFile = join(tempDir, files[0]);
      const content = readFileSync(traceFile, 'utf-8');
      const trace = JSON.parse(content.trim());

      expect(trace.context.success).toBe(true);
    });
  });

  describe('hook behavior', () => {
    it('should exit silently when collection is disabled', () => {
      process.env.AHE_COLLECTION_ENABLED = 'false';
      resetConfig();

      const input = JSON.stringify({
        tool_name: 'Read',
        tool_input: {},
        tool_output: 'output',
        execution_time_ms: 100,
      });

      const result = execSync(`echo '${input}' | node ${hookPath}`, {
        encoding: 'utf-8',
        env: { ...process.env },
      });

      // Should exit with 0 but produce no output
      expect(result.trim()).toBe('');
    });

    it('should handle empty input gracefully', () => {
      try {
        execSync(`echo '' | node ${hookPath}`, {
          encoding: 'utf-8',
          env: { ...process.env },
          stdio: 'pipe',
        });
        // Empty input should exit with 0 (skip)
        expect(true).toBe(true);
      } catch (error: any) {
        // Or it could exit with 0 silently
        expect(error.status).toBe(0);
      }
    });

    it('should cleanup old traces based on max_trace_files config', () => {
      process.env.AHE_MAX_TRACE_FILES = '2';
      resetConfig();

      // Create 3 traces with different session IDs
      for (let i = 0; i < 3; i++) {
        const input = JSON.stringify({
          tool_name: 'Read',
          tool_input: {},
          tool_output: `output ${i}`,
          execution_time_ms: 100,
        });

        // Use different session IDs by temporarily unsetting the env var
        delete process.env.CLAUDE_SESSION_ID;

        execSync(`echo '${input}' | node ${hookPath}`, {
          encoding: 'utf-8',
          env: { ...process.env },
        });

        // Small delay to ensure different timestamps
        const start = Date.now();
        while (Date.now() - start < 50) {
          // busy wait
        }
      }

      const files = readdirSync(tempDir).filter(f => f.endsWith('.jsonl'));

      // Should have kept only 2 files (max_trace_files)
      // Note: cleanup happens during each run, so we may have fewer
      expect(files.length).toBeLessThanOrEqual(2);

      delete process.env.AHE_MAX_TRACE_FILES;
    });
  });

  describe('trace data integrity', () => {
    it('should preserve all required trace fields', () => {
      const input = JSON.stringify({
        tool_name: 'Read',
        tool_input: { file_path: '/test/file.ts', limit: 100 },
        tool_output: 'content',
        execution_time_ms: 150,
        working_directory: '/project/root',
      });

      execSync(`echo '${input}' | node ${hookPath}`, {
        encoding: 'utf-8',
        env: { ...process.env },
      });

      const files = readdirSync(tempDir).filter(f => f.endsWith('.jsonl'));
      const traceFile = join(tempDir, files[0]);
      const content = readFileSync(traceFile, 'utf-8');
      const trace = JSON.parse(content.trim());

      // Verify all required fields exist
      expect(trace.timestamp).toBeDefined();
      expect(trace.session_id).toBeDefined();
      expect(trace.tool.name).toBe('Read');
      expect(trace.tool.input.file_path).toBe('/test/file.ts');
      expect(trace.tool.input.limit).toBe(100);
      expect(trace.tool.output).toBe('content');
      expect(trace.tool.execution_time_ms).toBe(150);
      expect(trace.context.working_directory).toBe('/project/root');
      expect(trace.context.success).toBeDefined();
    });

    it('should handle special characters in output', () => {
      // Use special characters that work well in shell commands
      // Avoid backslashes, control chars, and tricky quoting
      const specialOutput = 'Tabbed "quotes" and symbols: @#$%^&*!';
      const input = JSON.stringify({
        tool_name: 'Read',
        tool_input: {},
        tool_output: specialOutput,
        execution_time_ms: 100,
      });

      execSync(`echo '${input}' | node ${hookPath}`, {
        encoding: 'utf-8',
        env: { ...process.env },
      });

      const files = readdirSync(tempDir).filter(f => f.endsWith('.jsonl'));
      const traceFile = join(tempDir, files[0]);
      const content = readFileSync(traceFile, 'utf-8');
      const trace = JSON.parse(content.trim());

      expect(trace.tool.output).toBe(specialOutput);
    });
  });
});
