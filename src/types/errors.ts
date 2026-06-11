/**
 * Custom error types for AHE
 *
 * @module types/errors
 */

/**
 * Base error class for AHE-specific errors
 */
export class AHEError extends Error {
  /**
   * Optional context information about the error
   */
  public readonly context?: Record<string, unknown>;

  constructor(message: string, context?: Record<string, unknown>) {
    super(message);
    this.name = 'AHEError';
    this.context = context;
    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, AHEError.prototype);
  }
}

/**
 * Error thrown when trace writing fails
 */
export class TraceWriteError extends AHEError {
  constructor(
    message: string,
    public readonly traceFile?: string,
    context?: Record<string, unknown>
  ) {
    super(message, { ...context, traceFile });
    this.name = 'TraceWriteError';
    Object.setPrototypeOf(this, TraceWriteError.prototype);
  }
}

/**
 * Error thrown when configuration validation fails
 */
export class ConfigValidationError extends AHEError {
  constructor(
    message: string,
    public readonly configKey?: string,
    public readonly configValue?: unknown,
    context?: Record<string, unknown>
  ) {
    super(message, { ...context, configKey, configValue });
    this.name = 'ConfigValidationError';
    Object.setPrototypeOf(this, ConfigValidationError.prototype);
  }
}

/**
 * Error thrown when trace loading fails
 */
export class TraceLoadError extends AHEError {
  constructor(
    message: string,
    public readonly sessionId?: string,
    context?: Record<string, unknown>
  ) {
    super(message, { ...context, sessionId });
    this.name = 'TraceLoadError';
    Object.setPrototypeOf(this, TraceLoadError.prototype);
  }
}

/**
 * Error thrown when analysis fails
 */
export class AnalysisError extends AHEError {
  constructor(
    message: string,
    public readonly analysisType?: string,
    context?: Record<string, unknown>
  ) {
    super(message, { ...context, analysisType });
    this.name = 'AnalysisError';
    Object.setPrototypeOf(this, AnalysisError.prototype);
  }
}
