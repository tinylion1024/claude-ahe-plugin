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
export {};
//# sourceMappingURL=trace-collector.d.ts.map