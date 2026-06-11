#!/usr/bin/env node
/**
 * Session Summarizer Hook - Stop hook for Claude Code
 *
 * Generates a summary when a Claude Code session ends.
 *
 * Usage:
 *   node session-summarizer.js
 *
 * Environment Variables:
 *   AHE_COLLECTION_ENABLED   - Enable/disable collection (default: true)
 */

import { TraceManager } from '../lib/tracer.js';
import { getConfig } from '../lib/config.js';
import { getLogger } from '../lib/logger.js';
import { getSessionId } from '../lib/utils.js';

async function main(): Promise<void> {
  const config = getConfig();
  const logger = getLogger();

  if (!config.collection.enabled) {
    process.exit(0);
  }

  try {
    const sessionId = getSessionId();

    // Initialize trace manager with config
    const manager = new TraceManager(config.collection.trace_dir);

    // Generate summary
    const summary = await manager.generateSessionSummary(sessionId);

    // Output summary (for logging)
    if (summary.status === 'success') {
      console.log(
        JSON.stringify({
          status: 'summarized',
          session_id: sessionId,
          total_calls: summary.statistics.total_tool_calls,
          errors: summary.statistics.error_count,
          error_rate: summary.statistics.error_rate_percent.toFixed(1) + '%',
          slow_ops: summary.statistics.slow_operation_count,
          unique_tools: summary.statistics.unique_tools,
        })
      );
    } else {
      console.log(
        JSON.stringify({
          status: summary.status,
          session_id: sessionId,
          message: 'No traces collected in this session',
        })
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Error in session summarizer:', errorMessage);

    if (process.env.AHE_DEBUG === 'true' && error instanceof Error) {
      logger.debug('Stack trace:', error.stack);
    }

    process.exit(1);
  }
}

main();
