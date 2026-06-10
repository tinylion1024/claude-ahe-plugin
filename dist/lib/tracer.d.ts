/**
 * Trace Manager - Handles trace collection and retrieval
 *
 * @module lib/tracer
 */
import { TraceData, SessionSummary } from '../types/index.js';
/**
 * Manages trace collection, storage, and retrieval for Claude Code tool executions.
 *
 * @example
 * ```typescript
 * const manager = new TraceManager();
 * manager.saveTrace('Read', { file_path: '/test.txt' }, 'content', 150);
 * const traces = manager.loadTraces('session-123');
 * ```
 */
export declare class TraceManager {
    private traceDir;
    private slowThresholdMs;
    private errorKeywords;
    /**
     * Creates a new TraceManager instance.
     *
     * @param traceDir - Optional custom directory for storing traces.
     *                   Defaults to config value or ~/.claude-ahe/traces
     */
    constructor(traceDir?: string);
    /**
     * Save a tool execution trace to storage.
     *
     * @param toolName - Name of the tool (e.g., 'Read', 'Write', 'Bash')
     * @param toolInput - Input parameters passed to the tool
     * @param toolOutput - Output returned by the tool
     * @param executionTimeMs - Execution time in milliseconds
     * @param sessionId - Optional session ID (auto-generated if not provided)
     * @param workingDirectory - Optional working directory context
     * @param truncateLength - Maximum characters to store from output (default from config)
     * @returns The saved TraceData object
     */
    saveTrace(toolName: string, toolInput: Record<string, unknown>, toolOutput: unknown, executionTimeMs: number, sessionId?: string, workingDirectory?: string, truncateLength?: number): TraceData;
    /**
     * Load traces from storage.
     *
     * @param sessionId - Optional session ID to filter by
     * @param lastN - Optional limit on number of trace FILES to load (not traces)
     * @param since - Optional date to filter traces by timestamp
     * @returns Array of TraceData objects
     */
    loadTraces(sessionId?: string, lastN?: number, since?: Date): TraceData[];
    /**
     * Load session summaries from storage.
     *
     * @param sessionId - Optional session ID to load summary for
     * @param lastN - Optional limit on number of summaries to load
     * @returns Array of SessionSummary objects
     */
    loadSummaries(sessionId?: string, lastN?: number): SessionSummary[];
    /**
     * Generate a summary for a session.
     *
     * @param sessionId - Optional session ID (uses current session if not provided)
     * @returns SessionSummary object with statistics and issues
     */
    generateSessionSummary(sessionId?: string): SessionSummary;
    /**
     * Remove old trace files based on age and count.
     *
     * @param maxFiles - Maximum number of trace files to keep (default from config)
     * @param maxAgeDays - Maximum age of trace files in days (default from config)
     * @returns Number of files removed
     */
    cleanupOldTraces(maxFiles?: number, maxAgeDays?: number): number;
    /**
     * Load traces from a single file.
     *
     * @param traceFile - Path to the trace file
     * @param since - Optional date filter
     * @returns Array of TraceData objects
     */
    private loadTraceFile;
}
//# sourceMappingURL=tracer.d.ts.map