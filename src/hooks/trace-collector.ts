#!/usr/bin/env node
/**
 * Trace Collector Hook - PostToolUse hook for Claude Code
 *
 * Collects tool execution traces and saves them for analysis.
 *
 * Usage:
 *   echo '{"tool_name":"Read","tool_input":{},"tool_output":"...","execution_time_ms":150}' | node trace-collector.js
 *
 * Environment Variables:
 *   AHE_COLLECTION_ENABLED   - Enable/disable collection (default: true)
 *   AHE_MAX_TRACE_FILES      - Maximum number of trace files to keep (default: 100)
 *   AHE_TRUNCATE_CHARS       - Maximum characters in output (default: 1000)
 */

import { TraceManager } from '../lib/tracer.js';
import { getConfig } from '../lib/config.js';
import { PostToolUseEventSchema, PostToolUseEvent } from '../types/index.js';

async function main(): Promise<void> {
  const config = getConfig();

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
      console.error('[AHE] Empty input received, skipping');
      process.exit(0);
    }

    // Parse and validate JSON
    let parsed: unknown;
    try {
      parsed = JSON.parse(inputData);
    } catch (parseError) {
      console.error('[AHE] Invalid JSON input:', parseError);
      process.exit(1);
    }

    // Validate against schema
    const validationResult = PostToolUseEventSchema.safeParse(parsed);
    if (!validationResult.success) {
      console.error('[AHE] Invalid event structure:', validationResult.error.issues);
      process.exit(1);
    }

    const event: PostToolUseEvent = validationResult.data;

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

    console.error('[AHE] Error in trace collector:', errorMessage);
    if (errorStack && process.env.AHE_DEBUG === 'true') {
      console.error('[AHE] Stack trace:', errorStack);
    }

    process.exit(1);
  }
}

main();
