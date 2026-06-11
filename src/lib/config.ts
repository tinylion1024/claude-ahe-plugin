/**
 * Configuration Management for Claude AHE Plugin
 */

import { homedir } from 'os';
import { join } from 'path';
import { z } from 'zod';

/**
 * Redaction configuration schema
 */
export const RedactionConfigSchema = z.object({
  enabled: z.boolean().default(true),
  patterns: z.array(z.string()).default([
    // API Keys
    'sk-[a-zA-Z0-9]{20,}',
    'api[_-]?key[\\s:=]+[\\w-]+',
    'bearer\\s+[\\w-]+',
    // AWS
    'AKIA[A-Z0-9]{16}',
    'aws[_-]?secret[_-]?access[_-]?key[\\s:=]+[\\w/+=]+',
    // Generic secrets
    'secret[_-]?key[\\s:=]+[\\w-]+',
    'password[\\s:=]+[^\\s]+',
    'token[\\s:=]+[\\w-]+',
    // Private keys
    '-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----',
    // Connection strings
    'mongodb://[^\\s]+',
    'postgres(?:ql)?://[^\\s]+',
    'mysql://[^\\s]+',
    'redis://[^\\s]+',
  ]),
  replacement: z.string().default('[REDACTED]'),
});

export type RedactionConfig = z.infer<typeof RedactionConfigSchema>;

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
    max_errors_per_session: z.number().int().positive().default(10),
    max_slow_ops_per_session: z.number().int().positive().default(10),
    error_preview_length: z.number().int().positive().default(200),
  }),
  display: z.object({
    show_timestamps: z.boolean().default(true),
    show_execution_times: z.boolean().default(true),
    max_issues_shown: z.number().int().positive().default(5),
  }),
  redaction: RedactionConfigSchema,
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
    max_errors_per_session: 10,
    max_slow_ops_per_session: 10,
    error_preview_length: 200,
  },
  display: {
    show_timestamps: true,
    show_execution_times: true,
    max_issues_shown: 5,
  },
  redaction: {
    enabled: true,
    patterns: [
      'sk-[a-zA-Z0-9]{20,}',
      'api[_-]?key[\\s:=]+[\\w-]+',
      'bearer\\s+[\\w-]+',
      'AKIA[A-Z0-9]{16}',
      'aws[_-]?secret[_-]?access[_-]?key[\\s:=]+[\\w/+=]+',
      'secret[_-]?key[\\s:=]+[\\w-]+',
      'password[\\s:=]+[^\\s]+',
      'token[\\s:=]+[\\w-]+',
      '-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----',
      'mongodb://[^\\s]+',
      'postgres(?:ql)?://[^\\s]+',
      'mysql://[^\\s]+',
      'redis://[^\\s]+',
    ],
    replacement: '[REDACTED]',
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
  if (isNaN(parsed) || parsed <= 0) {
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
      max_errors_per_session: parseEnvInt(
        process.env.AHE_MAX_ERRORS_PER_SESSION,
        DEFAULT_CONFIG.analysis.max_errors_per_session
      ),
      max_slow_ops_per_session: parseEnvInt(
        process.env.AHE_MAX_SLOW_OPS_PER_SESSION,
        DEFAULT_CONFIG.analysis.max_slow_ops_per_session
      ),
      error_preview_length: parseEnvInt(
        process.env.AHE_ERROR_PREVIEW_LENGTH,
        DEFAULT_CONFIG.analysis.error_preview_length
      ),
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
    redaction: {
      enabled: parseEnvBool(process.env.AHE_REDACTION_ENABLED, DEFAULT_CONFIG.redaction.enabled),
      patterns: DEFAULT_CONFIG.redaction.patterns,
      replacement: process.env.AHE_REDACTION_REPLACEMENT ?? DEFAULT_CONFIG.redaction.replacement,
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
