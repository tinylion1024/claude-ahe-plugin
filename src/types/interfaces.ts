/**
 * Interface definitions for core AHE components
 *
 * @module types/interfaces
 */

import { TraceData, SessionSummary, AnalysisReport } from './index.js';

// Re-export ILogger from logger module
export type { ILogger } from '../lib/logger.js';

/**
 * TraceManager interface for trace collection and retrieval
 */
export interface ITraceManager {
  /**
   * Save a tool execution trace to storage
   */
  saveTrace(
    toolName: string,
    toolInput: Record<string, unknown>,
    toolOutput: unknown,
    executionTimeMs: number,
    sessionId?: string,
    workingDirectory?: string,
    truncateLength?: number
  ): Promise<TraceData>;

  /**
   * Load traces from storage
   */
  loadTraces(sessionId?: string, lastN?: number, since?: Date): Promise<TraceData[]>;

  /**
   * Load session summaries from storage
   */
  loadSummaries(sessionId?: string, lastN?: number): Promise<SessionSummary[]>;

  /**
   * Generate a summary for a session
   */
  generateSessionSummary(sessionId?: string): Promise<SessionSummary>;

  /**
   * Remove old trace files based on age and count
   */
  cleanupOldTraces(maxFiles?: number, maxAgeDays?: number): Promise<number>;
}

/**
 * Analyzer interface for trace analysis and reporting
 */
export interface IAnalyzer {
  /**
   * Analyze multiple sessions and generate a comprehensive report
   */
  analyzeSessions(sessionIds?: string[], lastN?: number): Promise<AnalysisReport>;

  /**
   * Analyze a single session in detail
   */
  analyzeSession(sessionId: string): Promise<AnalysisReport>;

  /**
   * Save analysis report to file
   */
  saveReport(report: AnalysisReport, outputFile?: string): Promise<boolean>;
}
