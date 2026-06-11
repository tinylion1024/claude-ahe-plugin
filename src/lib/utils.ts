/**
 * Utility functions for Claude AHE Plugin
 */

import { homedir } from 'os';
import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';

/**
 * Truncate output to avoid large trace files
 */
export function truncateOutput(output: unknown, maxLength: number = 1000): string {
  const outputStr = String(output);
  if (outputStr.length > maxLength) {
    return (
      outputStr.substring(0, maxLength) + `\n... [truncated, total: ${outputStr.length} chars]`
    );
  }
  return outputStr;
}

/**
 * Check if the output indicates an error
 */
export function isError(output: unknown, keywords: string[] = []): boolean {
  const errorKeywords =
    keywords.length > 0 ? keywords : ['error', 'failed', 'exception', 'traceback', 'timeout'];

  if (typeof output === 'string') {
    const outputLower = output.toLowerCase();
    return errorKeywords.some(keyword => outputLower.includes(keyword));
  }

  if (typeof output === 'object' && output !== null) {
    return 'error' in output || 'failed' in output;
  }

  return false;
}

/**
 * Get the current session ID from environment or generate one
 */
export function getSessionId(): string {
  // Try to get from Claude Code environment variable
  const sessionId = process.env.CLAUDE_SESSION_ID;

  if (sessionId) {
    return sessionId;
  }

  // Generate from current date/time
  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '_');

  return `session_${timestamp}`;
}

/**
 * Ensure a directory exists, creating it if necessary
 */
export function ensureDir(dirPath: string): boolean {
  try {
    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true });
    }
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get the default data directory for AHE
 */
export function getDataDir(): string {
  return join(homedir(), '.claude-ahe');
}

/**
 * Get the traces directory
 */
export function getTracesDir(): string {
  return join(getDataDir(), 'traces');
}

/**
 * Get the analysis directory
 */
export function getAnalysisDir(): string {
  return join(getDataDir(), 'analysis');
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(milliseconds: number): string {
  if (milliseconds < 1000) {
    return `${Math.round(milliseconds)}ms`;
  } else if (milliseconds < 60000) {
    const seconds = milliseconds / 1000;
    return `${seconds.toFixed(1)}s`;
  } else {
    const minutes = milliseconds / 60000;
    return `${minutes.toFixed(1)}m`;
  }
}

/**
 * Calculate statistics for a list of values
 */
export function calculateStatistics(values: number[]): {
  count: number;
  sum: number;
  min: number;
  max: number;
  avg: number;
} {
  if (values.length === 0) {
    return {
      count: 0,
      sum: 0,
      min: 0,
      max: 0,
      avg: 0,
    };
  }

  return {
    count: values.length,
    sum: values.reduce((a, b) => a + b, 0),
    min: Math.min(...values),
    max: Math.max(...values),
    avg: values.reduce((a, b) => a + b, 0) / values.length,
  };
}

/**
 * Get current timestamp in ISO format
 */
export function getTimestamp(): string {
  return new Date().toISOString();
}
