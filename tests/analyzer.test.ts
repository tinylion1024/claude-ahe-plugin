/**
 * Tests for AHEAnalyzer
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { AHEAnalyzer } from '../src/lib/analyzer';
import { TraceManager } from '../src/lib/tracer';
import { resetConfig } from '../src/lib/config';

describe('AHEAnalyzer', () => {
  let tempDir: string;
  let traceManager: TraceManager;
  let analyzer: AHEAnalyzer;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'ahe-test-'));
    process.env.AHE_TRACES_DIR = tempDir;
    process.env.AHE_ANALYSIS_DIR = join(tempDir, 'analysis');
    resetConfig();
    traceManager = new TraceManager(tempDir);
    analyzer = new AHEAnalyzer(tempDir);
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
    delete process.env.AHE_TRACES_DIR;
    delete process.env.AHE_ANALYSIS_DIR;
    resetConfig();
  });

  describe('analyzeSessions', () => {
    it('should return empty report when no traces', () => {
      const report = analyzer.analyzeSessions();

      expect(report.analysis_info.sessions_analyzed).toBe(0);
      expect(report.analysis_info.total_traces).toBe(0);
      expect(report.summary.total_tool_calls).toBe(0);
      expect(report.issues).toEqual([]);
    });

    it('should analyze tool usage statistics', () => {
      // Create test traces
      traceManager.saveTrace('Read', {}, 'output', 100, 'session-1');
      traceManager.saveTrace('Read', {}, 'output', 150, 'session-1');
      traceManager.saveTrace('Write', {}, 'output', 200, 'session-1');

      const report = analyzer.analyzeSessions();

      expect(report.tool_statistics.length).toBe(2);
      expect(report.tool_statistics[0].name).toBe('Read');
      expect(report.tool_statistics[0].call_count).toBe(2);
      expect(report.tool_statistics[1].name).toBe('Write');
      expect(report.tool_statistics[1].call_count).toBe(1);
    });

    it('should identify high error rate tools', () => {
      // Create traces with high error rate for Bash
      for (let i = 0; i < 8; i++) {
        traceManager.saveTrace('Bash', {}, 'Error: failed', 100, 'session-1');
      }
      for (let i = 0; i < 2; i++) {
        traceManager.saveTrace('Bash', {}, 'success', 100, 'session-1');
      }

      const report = analyzer.analyzeSessions();

      const bashStats = report.tool_statistics.find(s => s.name === 'Bash');
      expect(bashStats?.error_rate_percent).toBe(80);

      const errorIssue = report.issues.find(i => i.name.includes('High Error Rate'));
      expect(errorIssue).toBeDefined();
      expect(errorIssue?.severity).toBe('high');
    });

    it('should identify slow operations', () => {
      // Create slow traces (over 5000ms threshold)
      traceManager.saveTrace('Grep', {}, 'output', 8000, 'session-1');
      traceManager.saveTrace('Grep', {}, 'output', 9000, 'session-1');

      const report = analyzer.analyzeSessions();

      const slowIssue = report.issues.find(i => i.name.includes('Slow Operations'));
      expect(slowIssue).toBeDefined();
      expect(slowIssue?.severity).toBe('medium');
    });

    it('should generate recommendations', () => {
      // Create problematic traces
      for (let i = 0; i < 10; i++) {
        traceManager.saveTrace('Bash', {}, 'Error', 100, 'session-1');
      }

      const report = analyzer.analyzeSessions();

      expect(report.recommendations.length).toBeGreaterThan(0);
      expect(report.recommendations[0]).toContain('Priority');
    });

    it('should use custom slow threshold from config', () => {
      // Set custom threshold
      process.env.AHE_SLOW_THRESHOLD_MS = '100';
      resetConfig();
      analyzer = new AHEAnalyzer(tempDir);

      traceManager.saveTrace('Read', {}, 'output', 150, 'session-1');

      const report = analyzer.analyzeSessions();

      // With threshold of 100ms, 150ms should be slow
      expect(report.summary.slow_operations).toBe(1);
    });
  });

  describe('analyzeSession', () => {
    it('should analyze a specific session', () => {
      traceManager.saveTrace('Read', {}, 'output', 100, 'session-1');
      traceManager.saveTrace('Write', {}, 'output', 200, 'session-2');

      const report = analyzer.analyzeSession('session-1');

      expect(report.analysis_info.sessions_analyzed).toBe(1);
      expect(report.tool_statistics.length).toBe(1);
      expect(report.tool_statistics[0].name).toBe('Read');
    });
  });

  describe('saveReport', () => {
    it('should save report to file', () => {
      traceManager.saveTrace('Read', {}, 'output', 100, 'session-1');

      const report = analyzer.analyzeSessions();
      const outputPath = join(tempDir, 'test-report.json');

      const saved = analyzer.saveReport(report, outputPath);

      expect(saved).toBe(true);
      expect(existsSync(outputPath)).toBe(true);

      const savedReport = JSON.parse(readFileSync(outputPath, 'utf-8'));
      expect(savedReport.analysis_info.total_traces).toBe(1);
    });

    it('should save to default location when no path provided', () => {
      traceManager.saveTrace('Read', {}, 'output', 100, 'session-1');

      const report = analyzer.analyzeSessions();
      const saved = analyzer.saveReport(report);

      expect(saved).toBe(true);
    });

    it('should return false on save error', () => {
      const report = analyzer.analyzeSessions();
      // Try to save to invalid path
      const saved = analyzer.saveReport(report, '/nonexistent/path/report.json');

      expect(saved).toBe(false);
    });
  });
});
