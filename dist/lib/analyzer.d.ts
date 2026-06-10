/**
 * AHE Analyzer - Analysis engine for Claude Code AHE Plugin
 *
 * @module lib/analyzer
 */
import { AnalysisReport } from '../types/index.js';
/**
 * Analyzes collected traces and generates improvement recommendations.
 *
 * @example
 * ```typescript
 * const analyzer = new AHEAnalyzer();
 * const report = analyzer.analyzeSessions(undefined, 5);
 * analyzer.saveReport(report, 'report.json');
 * ```
 */
export declare class AHEAnalyzer {
    private traceManager;
    private config;
    private slowThresholdMs;
    private errorKeywords;
    /**
     * Creates a new AHEAnalyzer instance.
     *
     * @param traceDir - Optional custom trace directory
     */
    constructor(traceDir?: string);
    /**
     * Analyze multiple sessions and generate a comprehensive report.
     *
     * @param sessionIds - Optional array of specific session IDs to analyze
     * @param lastN - Number of recent sessions to analyze (default from config)
     * @returns Complete AnalysisReport with statistics, issues, and recommendations
     */
    analyzeSessions(sessionIds?: string[], lastN?: number): AnalysisReport;
    /**
     * Analyze a single session in detail.
     *
     * @param sessionId - The session ID to analyze
     * @returns AnalysisReport for the specified session
     */
    analyzeSession(sessionId: string): AnalysisReport;
    /**
     * Create an empty report for cases with no traces.
     */
    private createEmptyReport;
    /**
     * Analyze tool usage statistics.
     */
    private analyzeToolUsage;
    /**
     * Identify issues from traces and statistics.
     */
    private identifyIssues;
    /**
     * Generate actionable recommendations.
     */
    private generateRecommendations;
    /**
     * Generate summary statistics.
     */
    private generateSummary;
    /**
     * Get the time range of traces.
     */
    private getTimeRange;
    /**
     * Save analysis report to file.
     *
     * @param report - The AnalysisReport to save
     * @param outputFile - Optional custom output file path
     * @returns true if saved successfully, false otherwise
     */
    saveReport(report: AnalysisReport, outputFile?: string): boolean;
}
//# sourceMappingURL=analyzer.d.ts.map