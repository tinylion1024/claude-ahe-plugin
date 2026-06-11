#!/usr/bin/env node
/**
 * Trace Collector Hook - PostToolUse hook for Claude Code
 *
 * Collects tool execution traces and saves them for analysis.
 *
 * Claude Code PostToolUse hook input format (may vary):
 * - tool_name / tool / toolName - the tool name
 * - tool_input / input / toolInput - tool parameters
 * - tool_output / output / toolOutput - tool result
 * - execution_time_ms / executionTime / execution_time - execution time
 * - working_directory / cwd - current working directory (optional)
 *
 * Environment Variables:
 *   AHE_COLLECTION_ENABLED   - Enable/disable collection (default: true)
 *   AHE_MAX_TRACE_FILES      - Maximum number of trace files to keep (default: 100)
 *   AHE_TRUNCATE_CHARS       - Maximum characters in output (default: 1000)
 */

import { TraceManager } from '../lib/tracer.js';
import { getConfig } from '../lib/config.js';
import { getLogger } from '../lib/logger.js';

/**
 * Normalized hook event after field name reconciliation
 */
interface NormalizedEvent {
  tool_name: string;
  tool_input: Record<string, unknown>;
  tool_output: unknown;
  execution_time_ms: number;
  working_directory: string;
}

/**
 * Normalize hook event field names to handle different formats from Claude Code
 */
function normalizeEvent(parsed: Record<string, unknown>): NormalizedEvent {
  const execTime = (parsed.execution_time_ms ||
    parsed.executionTime ||
    parsed.execution_time ||
    0) as number;
  return {
    tool_name: (parsed.tool_name || parsed.tool || parsed.toolName || 'Unknown') as string,
    tool_input: (parsed.tool_input || parsed.input || parsed.toolInput || {}) as Record<
      string,
      unknown
    >,
    tool_output: parsed.tool_output ?? parsed.output ?? parsed.toolOutput ?? '',
    execution_time_ms: Math.max(0, execTime), // Ensure non-negative
    working_directory: (parsed.working_directory || parsed.cwd || process.cwd()) as string,
  };
}

async function main(): Promise<void> {
  const config = getConfig();
  const logger = getLogger();

  if (!config.collection.enabled) {
    // Collection disabled, exit silently
    process.exit(0);
  }

  try {
    // Read hook input from stdin
    let inputData = '';

    for await (const chunk of process.stdin) {
      inputData += chunk;
    }

    // Validate input is not empty
    if (!inputData.trim()) {
      logger.debug('Empty input received, skipping');
      process.exit(0);
    }

    // Parse JSON
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(inputData);
    } catch (parseError) {
      logger.error('Invalid JSON input:', parseError);
      process.exit(1);
    }

    // Normalize field names (Claude Code may use different field names)
    const event = normalizeEvent(parsed);

    // Initialize trace manager with config
    const manager = new TraceManager(config.collection.trace_dir);

    // Save trace with configured truncate length
    const trace = await manager.saveTrace(
      event.tool_name,
      event.tool_input,
      event.tool_output,
      event.execution_time_ms,
      undefined, // session_id (will be auto-generated)
      event.working_directory,
      config.collection.truncate_output_chars
    );

    // Cleanup old traces with configured max files
    await manager.cleanupOldTraces(config.collection.max_trace_files);

    // Return success (no modification to tool output)
    console.log(
      JSON.stringify({
        status: 'collected',
        trace_id: trace.timestamp,
        session_id: trace.session_id,
      })
    );
  } catch (error) {
    // Log error with details but don't crash Claude Code
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    logger.error('Error in trace collector:', errorMessage);
    if (errorStack && process.env.AHE_DEBUG === 'true') {
      logger.debug('Stack trace:', errorStack);
    }

    process.exit(1);
  }
}

main();
