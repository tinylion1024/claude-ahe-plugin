/**
 * Logger Module - Configurable logging system for AHE
 *
 * @module lib/logger
 */

/**
 * Log levels for controlling output verbosity
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4,
}

/**
 * Logger interface for consistent logging API
 */
export interface ILogger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

/**
 * Console-based logger that outputs to stdout/stderr
 */
export class ConsoleLogger implements ILogger {
  constructor(private level: LogLevel = LogLevel.INFO) {}

  debug(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.DEBUG) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.INFO) {
      console.log(`[INFO] ${message}`, ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.WARN) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }

  error(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.ERROR) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  }
}

/**
 * Silent logger that suppresses all output
 */
export class SilentLogger implements ILogger {
  debug(_message: string, ..._args: unknown[]): void {
    // Silent - no output
  }

  info(_message: string, ..._args: unknown[]): void {
    // Silent - no output
  }

  warn(_message: string, ..._args: unknown[]): void {
    // Silent - no output
  }

  error(_message: string, ..._args: unknown[]): void {
    // Silent - no output
  }
}

/**
 * Parse log level from string
 *
 * @param level - String representation of log level
 * @returns LogLevel enum value
 */
function parseLogLevel(level: string | undefined): LogLevel {
  if (!level) {
    return LogLevel.INFO;
  }

  const normalized = level.toUpperCase().trim();

  switch (normalized) {
    case 'DEBUG':
      return LogLevel.DEBUG;
    case 'INFO':
      return LogLevel.INFO;
    case 'WARN':
    case 'WARNING':
      return LogLevel.WARN;
    case 'ERROR':
      return LogLevel.ERROR;
    case 'SILENT':
    case 'QUIET':
    case 'NONE':
      return LogLevel.SILENT;
    default:
      console.warn(`[AHE] Unknown log level "${level}", defaulting to INFO`);
      return LogLevel.INFO;
  }
}

/**
 * Create a logger instance based on environment configuration
 *
 * @param envValue - Optional log level string (defaults to AHE_LOG_LEVEL env var)
 * @returns ILogger instance
 */
export function createLogger(envValue?: string): ILogger {
  const levelString = envValue ?? process.env.AHE_LOG_LEVEL;
  const level = parseLogLevel(levelString);

  if (level === LogLevel.SILENT) {
    return new SilentLogger();
  }

  return new ConsoleLogger(level);
}

/**
 * Global logger instance (singleton pattern)
 */
let globalLogger: ILogger | null = null;

/**
 * Get the global logger instance
 *
 * @returns ILogger instance
 */
export function getLogger(): ILogger {
  if (!globalLogger) {
    globalLogger = createLogger();
  }
  return globalLogger;
}

/**
 * Reset logger (useful for testing)
 */
export function resetLogger(): void {
  globalLogger = null;
}
