/**
 * Configuration Management for Claude AHE Plugin
 */

import { homedir } from 'os';
import { join } from 'path';
import { z } from 'zod';

/**
 * Configuration schema using Zod for validation
 */
export const AHEConfigSchema = z.object({
  collection: z.object({
    enabled: z.boolean().default(true),
    max_trace_files: z.number().int().positive().default(100),
    truncate_output_chars: z.number().int().positive().default(1000),
    trace_dir: z.string().default(join(homedir(), '.claude-ahe', 'traces')),
    max_trace_age_days: z.number().int().positive().default(7),
  }),
  analysis: z.object({
    default_lookback_sessions: z.number().int().positive().default(5),
    slow_operation_threshold_ms: z.number().int().positive().default(5000),
    error_keywords: z
      .array(z.string())
      .default(['error', 'failed', 'exception', 'traceback', 'timeout']),
    analysis_dir: z.string().default(join(homedir(), '.claude-ahe', 'analysis')),
  }),
  display: z.object({
    show_timestamps: z.boolean().default(true),
    show_execution_times: z.boolean().default(true),
    max_issues_shown: z.number().int().positive().default(5),
  }),
});

export type AHEConfig = z.infer<typeof AHEConfigSchema>;

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: AHEConfig = {
  collection: {
    enabled: true,
    max_trace_files: 100,
    truncate_output_chars: 1000,
    trace_dir: join(homedir(), '.claude-ahe', 'traces'),
    max_trace_age_days: 7,
  },
  analysis: {
    default_lookback_sessions: 5,
    slow_operation_threshold_ms: 5000,
    error_keywords: ['error', 'failed', 'exception', 'traceback', 'timeout'],
    analysis_dir: join(homedir(), '.claude-ahe', 'analysis'),
  },
  display: {
    show_timestamps: true,
    show_execution_times: true,
    max_issues_shown: 5,
  },
};

/**
 * Validate environment variable paths to prevent path traversal
 */
function validatePath(path: string): boolean {
  // Prevent path traversal attacks
  if (path.includes('..') || path.includes('~')) {
    return false;
  }
  // Must be an absolute path or relative to current directory
  return true;
}

/**
 * Parse integer environment variable with validation
 */
function parseEnvInt(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed < 0) {
    console.warn(`[AHE] Invalid environment value: ${value}, using default: ${defaultValue}`);
    return defaultValue;
  }
  return parsed;
}

/**
 * Parse boolean environment variable
 */
function parseEnvBool(value: string | undefined, defaultValue: boolean): boolean {
  if (!value) return defaultValue;
  return value.toLowerCase() !== 'false';
}

/**
 * Load configuration from environment variables and defaults
 */
export function loadConfig(): AHEConfig {
  // Read environment variables with validation
  const envTraceDir = process.env.AHE_TRACES_DIR;
  const envAnalysisDir = process.env.AHE_ANALYSIS_DIR;

  // Validate custom paths if provided
  if (envTraceDir && !validatePath(envTraceDir)) {
    console.warn('[AHE] AHE_TRACES_DIR contains invalid path, using default');
  }
  if (envAnalysisDir && !validatePath(envAnalysisDir)) {
    console.warn('[AHE] AHE_ANALYSIS_DIR contains invalid path, using default');
  }

  const config: AHEConfig = {
    collection: {
      enabled: parseEnvBool(process.env.AHE_COLLECTION_ENABLED, DEFAULT_CONFIG.collection.enabled),
      max_trace_files: parseEnvInt(
        process.env.AHE_MAX_TRACE_FILES,
        DEFAULT_CONFIG.collection.max_trace_files
      ),
      truncate_output_chars: parseEnvInt(
        process.env.AHE_TRUNCATE_CHARS,
        DEFAULT_CONFIG.collection.truncate_output_chars
      ),
      trace_dir:
        envTraceDir && validatePath(envTraceDir)
          ? envTraceDir
          : DEFAULT_CONFIG.collection.trace_dir,
      max_trace_age_days: parseEnvInt(
        process.env.AHE_MAX_TRACE_AGE_DAYS,
        DEFAULT_CONFIG.collection.max_trace_age_days
      ),
    },
    analysis: {
      default_lookback_sessions: parseEnvInt(
        process.env.AHE_LOOKBACK_SESSIONS,
        DEFAULT_CONFIG.analysis.default_lookback_sessions
      ),
      slow_operation_threshold_ms: parseEnvInt(
        process.env.AHE_SLOW_THRESHOLD_MS,
        DEFAULT_CONFIG.analysis.slow_operation_threshold_ms
      ),
      error_keywords: DEFAULT_CONFIG.analysis.error_keywords, // Keep default keywords
      analysis_dir:
        envAnalysisDir && validatePath(envAnalysisDir)
          ? envAnalysisDir
          : DEFAULT_CONFIG.analysis.analysis_dir,
    },
    display: {
      show_timestamps: parseEnvBool(
        process.env.AHE_SHOW_TIMESTAMPS,
        DEFAULT_CONFIG.display.show_timestamps
      ),
      show_execution_times: parseEnvBool(
        process.env.AHE_SHOW_TIMES,
        DEFAULT_CONFIG.display.show_execution_times
      ),
      max_issues_shown: parseEnvInt(
        process.env.AHE_MAX_ISSUES,
        DEFAULT_CONFIG.display.max_issues_shown
      ),
    },
  };

  // Validate final config
  return AHEConfigSchema.parse(config);
}

/**
 * Global config instance (singleton pattern)
 */
let globalConfig: AHEConfig | null = null;

/**
 * Get the global configuration instance
 */
export function getConfig(): AHEConfig {
  if (!globalConfig) {
    globalConfig = loadConfig();
  }
  return globalConfig;
}

/**
 * Reset configuration (useful for testing)
 */
export function resetConfig(): void {
  globalConfig = null;
}
