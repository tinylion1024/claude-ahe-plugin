/**
 * Trace Manager - Handles trace collection and retrieval
 *
 * @module lib/tracer
 */

import {
  appendFileSync,
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'fs';
import { join } from 'path';
import {
  TraceData,
  SessionSummary,
  SessionStatistics,
  ToolStatistics,
  ErrorInfo,
  SlowOperationInfo,
} from '../types/index.js';
import { truncateOutput, getSessionId, ensureDir, isError, getTimestamp } from './utils.js';
import { getConfig } from './config.js';

/**
 * Manages trace collection, storage, and retrieval for Claude Code tool executions.
 *
 * @example
 * ```typescript
 * const manager = new TraceManager();
 * manager.saveTrace('Read', { file_path: '/test.txt' }, 'content', 150);
 * const traces = manager.loadTraces('session-123');
 * ```
 */
export class TraceManager {
  private traceDir: string;
  private slowThresholdMs: number;
  private errorKeywords: string[];

  /**
   * Creates a new TraceManager instance.
   *
   * @param traceDir - Optional custom directory for storing traces.
   *                   Defaults to config value or ~/.claude-ahe/traces
   */
  constructor(traceDir?: string) {
    const config = getConfig();
    this.traceDir = traceDir || config.collection.trace_dir;
    this.slowThresholdMs = config.analysis.slow_operation_threshold_ms;
    this.errorKeywords = config.analysis.error_keywords;

    if (!ensureDir(this.traceDir)) {
      throw new Error(`Failed to create trace directory: ${this.traceDir}`);
    }
  }

  /**
   * Save a tool execution trace to storage.
   *
   * @param toolName - Name of the tool (e.g., 'Read', 'Write', 'Bash')
   * @param toolInput - Input parameters passed to the tool
   * @param toolOutput - Output returned by the tool
   * @param executionTimeMs - Execution time in milliseconds
   * @param sessionId - Optional session ID (auto-generated if not provided)
   * @param workingDirectory - Optional working directory context
   * @param truncateLength - Maximum characters to store from output (default from config)
   * @returns The saved TraceData object
   */
  saveTrace(
    toolName: string,
    toolInput: Record<string, unknown>,
    toolOutput: unknown,
    executionTimeMs: number,
    sessionId?: string,
    workingDirectory?: string,
    truncateLength?: number
  ): TraceData {
    const config = getConfig();
    const maxLen = truncateLength ?? config.collection.truncate_output_chars;

    const trace: TraceData = {
      timestamp: getTimestamp(),
      session_id: sessionId || getSessionId(),
      tool: {
        name: toolName,
        input: toolInput,
        output: truncateOutput(toolOutput, maxLen),
        execution_time_ms: Math.round(executionTimeMs * 100) / 100,
      },
      context: {
        working_directory: workingDirectory || process.cwd(),
        success: !isError(toolOutput, this.errorKeywords),
      },
    };

    // Append to session trace file (JSON Lines format)
    const traceFile = join(this.traceDir, `${trace.session_id}.jsonl`);

    try {
      appendFileSync(traceFile, JSON.stringify(trace) + '\n', 'utf-8');
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(`[AHE] Failed to save trace: ${errMsg}`);
      throw error;
    }

    return trace;
  }

  /**
   * Load traces from storage.
   *
   * @param sessionId - Optional session ID to filter by
   * @param lastN - Optional limit on number of trace FILES to load (not traces)
   * @param since - Optional date to filter traces by timestamp
   * @returns Array of TraceData objects
   */
  loadTraces(sessionId?: string, lastN?: number, since?: Date): TraceData[] {
    const traces: TraceData[] = [];

    if (sessionId) {
      // Load specific session
      const traceFile = join(this.traceDir, `${sessionId}.jsonl`);
      return this.loadTraceFile(traceFile, since);
    }

    // Load multiple sessions
    let traceFiles: string[];
    try {
      traceFiles = readdirSync(this.traceDir)
        .filter(f => f.endsWith('.jsonl'))
        .map(f => join(this.traceDir, f))
        .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
    } catch (error) {
      console.warn('[AHE] Could not read traces directory:', error);
      return [];
    }

    if (lastN) {
      traceFiles = traceFiles.slice(0, lastN);
    }

    for (const traceFile of traceFiles) {
      const fileTraces = this.loadTraceFile(traceFile, since);
      traces.push(...fileTraces);
    }

    return traces;
  }

  /**
   * Load session summaries from storage.
   *
   * @param sessionId - Optional session ID to load summary for
   * @param lastN - Optional limit on number of summaries to load
   * @returns Array of SessionSummary objects
   */
  loadSummaries(sessionId?: string, lastN?: number): SessionSummary[] {
    const summaries: SessionSummary[] = [];

    if (sessionId) {
      const summaryFile = join(this.traceDir, `${sessionId}_summary.json`);
      if (existsSync(summaryFile)) {
        try {
          const content = readFileSync(summaryFile, 'utf-8');
          summaries.push(JSON.parse(content));
        } catch (error) {
          console.warn(`[AHE] Could not load summary for session ${sessionId}:`, error);
        }
      }
      return summaries;
    }

    let summaryFiles: string[];
    try {
      summaryFiles = readdirSync(this.traceDir)
        .filter(f => f.endsWith('_summary.json'))
        .map(f => join(this.traceDir, f))
        .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
    } catch (error) {
      console.warn('[AHE] Could not read summaries:', error);
      return [];
    }

    if (lastN) {
      summaryFiles = summaryFiles.slice(0, lastN);
    }

    for (const summaryFile of summaryFiles) {
      try {
        const content = readFileSync(summaryFile, 'utf-8');
        summaries.push(JSON.parse(content));
      } catch (error) {
        console.warn(`[AHE] Skipping invalid summary file: ${summaryFile}`);
        continue;
      }
    }

    return summaries;
  }

  /**
   * Generate a summary for a session.
   *
   * @param sessionId - Optional session ID (uses current session if not provided)
   * @returns SessionSummary object with statistics and issues
   */
  generateSessionSummary(sessionId?: string): SessionSummary {
    const id = sessionId || getSessionId();
    const traces = this.loadTraces(id);

    if (traces.length === 0) {
      return {
        session_id: id,
        timestamp: getTimestamp(),
        status: 'no_traces',
        statistics: {
          total_tool_calls: 0,
          unique_tools: 0,
          error_count: 0,
          error_rate_percent: 0,
          slow_operation_count: 0,
          slow_rate_percent: 0,
        },
        tool_usage: {},
        tool_statistics: {},
      };
    }

    // Calculate statistics
    const toolCounts: Record<string, number> = {};
    const toolTimes: Record<string, number[]> = {};
    const toolErrors: Record<string, number> = {};
    let errorCount = 0;
    let slowCount = 0;
    const errors: ErrorInfo[] = [];
    const slowOps: SlowOperationInfo[] = [];

    for (const trace of traces) {
      const toolName = trace.tool.name;

      // Count tool usage
      toolCounts[toolName] = (toolCounts[toolName] || 0) + 1;

      // Track times
      if (!toolTimes[toolName]) {
        toolTimes[toolName] = [];
      }
      toolTimes[toolName].push(trace.tool.execution_time_ms);

      // Track errors
      if (!trace.context.success) {
        errorCount++;
        toolErrors[toolName] = (toolErrors[toolName] || 0) + 1;
        errors.push({
          tool: toolName,
          timestamp: trace.timestamp,
          output_preview: trace.tool.output.substring(0, 200),
        });
      }

      // Track slow operations
      if (trace.tool.execution_time_ms > this.slowThresholdMs) {
        slowCount++;
        slowOps.push({
          tool: toolName,
          execution_time_ms: trace.tool.execution_time_ms,
          timestamp: trace.timestamp,
        });
      }
    }

    // Build tool statistics
    const toolStats: Record<string, ToolStatistics> = {};
    for (const [tool, times] of Object.entries(toolTimes)) {
      const sum = times.reduce((a, b) => a + b, 0);
      toolStats[tool] = {
        count: times.length,
        avg_time_ms: sum / times.length,
        max_time_ms: Math.max(...times),
        min_time_ms: Math.min(...times),
      };
    }

    const totalCalls = traces.length;
    const summary: SessionSummary = {
      session_id: id,
      timestamp: getTimestamp(),
      status: 'success',
      session_info: {
        start_time: traces[0].timestamp,
        end_time: traces[traces.length - 1].timestamp,
      },
      statistics: {
        total_tool_calls: totalCalls,
        unique_tools: Object.keys(toolCounts).length,
        error_count: errorCount,
        error_rate_percent: Math.round((errorCount / totalCalls) * 10000) / 100,
        slow_operation_count: slowCount,
        slow_rate_percent: Math.round((slowCount / totalCalls) * 10000) / 100,
      },
      tool_usage: toolCounts,
      tool_statistics: toolStats,
      issues: {
        errors: errors.slice(0, 10),
        slow_operations: slowOps
          .sort((a, b) => b.execution_time_ms - a.execution_time_ms)
          .slice(0, 10),
      },
    };

    // Save summary
    const summaryFile = join(this.traceDir, `${id}_summary.json`);
    try {
      writeFileSync(summaryFile, JSON.stringify(summary, null, 2), 'utf-8');
    } catch (error) {
      console.error(`[AHE] Failed to save session summary: ${error}`);
    }

    return summary;
  }

  /**
   * Remove old trace files based on age and count.
   *
   * @param maxFiles - Maximum number of trace files to keep (default from config)
   * @param maxAgeDays - Maximum age of trace files in days (default from config)
   * @returns Number of files removed
   */
  cleanupOldTraces(maxFiles?: number, maxAgeDays?: number): number {
    const config = getConfig();
    const maxFilesCount = maxFiles ?? config.collection.max_trace_files;
    const maxAge = maxAgeDays ?? config.collection.max_trace_age_days;
    const cutoffTime = Date.now() - maxAge * 24 * 60 * 60 * 1000;

    let traceFiles: { path: string; mtime: number; name: string }[];
    try {
      traceFiles = readdirSync(this.traceDir)
        .filter(f => f.endsWith('.jsonl'))
        .map(f => ({
          path: join(this.traceDir, f),
          mtime: statSync(join(this.traceDir, f)).mtimeMs,
          name: f,
        }))
        .sort((a, b) => b.mtime - a.mtime);
    } catch (error) {
      console.warn('[AHE] Could not read traces for cleanup:', error);
      return 0;
    }

    let removed = 0;
    for (let i = 0; i < traceFiles.length; i++) {
      const file = traceFiles[i];
      const shouldRemove = file.mtime < cutoffTime || i >= maxFilesCount;

      if (shouldRemove) {
        try {
          unlinkSync(file.path);
          removed++;

          // Also remove corresponding summary
          const summaryFile = file.path.replace('.jsonl', '_summary.json');
          if (existsSync(summaryFile)) {
            unlinkSync(summaryFile);
          }
        } catch (error) {
          console.warn(`[AHE] Could not delete trace file ${file.name}:`, error);
        }
      }
    }

    return removed;
  }

  /**
   * Load traces from a single file.
   *
   * @param traceFile - Path to the trace file
   * @param since - Optional date filter
   * @returns Array of TraceData objects
   */
  private loadTraceFile(traceFile: string, since?: Date): TraceData[] {
    const traces: TraceData[] = [];

    if (!existsSync(traceFile)) {
      return traces;
    }

    try {
      const content = readFileSync(traceFile, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());

      for (const line of lines) {
        try {
          const trace: TraceData = JSON.parse(line);

          // Filter by timestamp if specified
          if (since) {
            const traceTime = new Date(trace.timestamp);
            if (traceTime < since) {
              continue;
            }
          }

          traces.push(trace);
        } catch (parseError) {
          // Skip malformed lines but log warning
          console.warn(`[AHE] Skipping malformed trace line in ${traceFile}`);
        }
      }
    } catch (error) {
      console.warn(`[AHE] Could not read trace file ${traceFile}:`, error);
    }

    return traces;
  }
}
