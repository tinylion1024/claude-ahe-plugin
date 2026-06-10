/**
 * AHE Analyzer - Analysis engine for Claude Code AHE Plugin
 *
 * @module lib/analyzer
 */
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { TraceManager } from './tracer.js';
import { getConfig } from './config.js';
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
export class AHEAnalyzer {
    traceManager;
    config;
    slowThresholdMs;
    errorKeywords;
    /**
     * Creates a new AHEAnalyzer instance.
     *
     * @param traceDir - Optional custom trace directory
     */
    constructor(traceDir) {
        this.config = getConfig();
        this.traceManager = new TraceManager(traceDir || this.config.collection.trace_dir);
        this.slowThresholdMs = this.config.analysis.slow_operation_threshold_ms;
        this.errorKeywords = this.config.analysis.error_keywords;
    }
    /**
     * Analyze multiple sessions and generate a comprehensive report.
     *
     * @param sessionIds - Optional array of specific session IDs to analyze
     * @param lastN - Number of recent sessions to analyze (default from config)
     * @returns Complete AnalysisReport with statistics, issues, and recommendations
     */
    analyzeSessions(sessionIds, lastN) {
        const lookback = lastN ?? this.config.analysis.default_lookback_sessions;
        // Load traces and summaries
        const traces = this.traceManager.loadTraces(sessionIds ? sessionIds[0] : undefined, sessionIds ? undefined : lookback);
        const summaries = this.traceManager.loadSummaries(sessionIds ? sessionIds[0] : undefined, sessionIds ? undefined : lookback);
        if (traces.length === 0) {
            return this.createEmptyReport();
        }
        // Perform analysis
        const toolStats = this.analyzeToolUsage(traces);
        const issues = this.identifyIssues(traces, toolStats, summaries);
        const recommendations = this.generateRecommendations(issues);
        // Build report
        const report = {
            timestamp: new Date().toISOString(),
            analysis_info: {
                sessions_analyzed: new Set(traces.map(t => t.session_id)).size,
                total_traces: traces.length,
                time_range: this.getTimeRange(traces),
            },
            summary: this.generateSummary(traces, toolStats, issues),
            tool_statistics: toolStats,
            issues: issues,
            recommendations: recommendations,
        };
        return report;
    }
    /**
     * Analyze a single session in detail.
     *
     * @param sessionId - The session ID to analyze
     * @returns AnalysisReport for the specified session
     */
    analyzeSession(sessionId) {
        return this.analyzeSessions([sessionId]);
    }
    /**
     * Create an empty report for cases with no traces.
     */
    createEmptyReport() {
        return {
            timestamp: new Date().toISOString(),
            analysis_info: {
                sessions_analyzed: 0,
                total_traces: 0,
                time_range: { start: null, end: null },
            },
            summary: {
                total_tool_calls: 0,
                unique_tools: 0,
                total_errors: 0,
                error_rate_percent: 0,
                slow_operations: 0,
                slow_rate_percent: 0,
                issues_found: 0,
                most_used_tool: null,
                average_execution_time_ms: 0,
            },
            tool_statistics: [],
            issues: [],
            recommendations: [],
        };
    }
    /**
     * Analyze tool usage statistics.
     */
    analyzeToolUsage(traces) {
        const toolData = {};
        for (const trace of traces) {
            const toolName = trace.tool.name;
            const execTime = trace.tool.execution_time_ms;
            const isErr = !trace.context.success;
            if (!toolData[toolName]) {
                toolData[toolName] = { times: [], errors: 0 };
            }
            toolData[toolName].times.push(execTime);
            if (isErr) {
                toolData[toolName].errors++;
            }
        }
        const stats = [];
        for (const [name, data] of Object.entries(toolData)) {
            const times = data.times;
            const errorCount = data.errors;
            const sum = times.reduce((a, b) => a + b, 0);
            stats.push({
                name,
                call_count: times.length,
                total_time_ms: sum,
                avg_time_ms: sum / times.length,
                max_time_ms: Math.max(...times),
                min_time_ms: Math.min(...times),
                error_count: errorCount,
                error_rate_percent: (errorCount / times.length) * 100,
            });
        }
        return stats.sort((a, b) => b.call_count - a.call_count);
    }
    /**
     * Identify issues from traces and statistics.
     */
    identifyIssues(traces, toolStats, summaries) {
        const issues = [];
        const maxIssues = this.config.display.max_issues_shown * 2; // Get more, then filter
        // 1. High error rate tools
        for (const stat of toolStats) {
            if (stat.error_rate_percent > 10 && stat.call_count >= 5) {
                issues.push({
                    name: `High Error Rate: ${stat.name}`,
                    occurrences: stat.error_count,
                    severity: stat.error_rate_percent > 20 ? 'high' : 'medium',
                    root_cause: `Tool ${stat.name} has ${stat.error_rate_percent.toFixed(1)}% error rate across ${stat.call_count} calls`,
                    suggested_fix: `Review and validate inputs for ${stat.name}; check for missing dependencies or incorrect parameters`,
                    priority: Math.min(10, Math.floor(stat.error_rate_percent / 10) + 5),
                });
            }
        }
        // 2. Slow operations
        const slowTraces = traces.filter(t => t.tool.execution_time_ms > this.slowThresholdMs);
        if (slowTraces.length > 0) {
            const slowTools = {};
            for (const t of slowTraces) {
                slowTools[t.tool.name] = (slowTools[t.tool.name] || 0) + 1;
            }
            const sortedSlowTools = Object.entries(slowTools)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3);
            for (const [toolName, count] of sortedSlowTools) {
                issues.push({
                    name: `Slow Operations: ${toolName}`,
                    occurrences: count,
                    severity: 'medium',
                    root_cause: `${toolName} operations regularly exceed ${this.slowThresholdMs}ms threshold`,
                    suggested_fix: 'Consider adding pagination, caching, or optimizing the operation',
                    priority: 7,
                });
            }
        }
        // 3. Failed sessions
        const failedSessions = summaries.filter(s => s.statistics.error_rate_percent > 20);
        if (failedSessions.length > 0) {
            issues.push({
                name: 'Sessions with High Failure Rates',
                occurrences: failedSessions.length,
                severity: 'high',
                root_cause: `${failedSessions.length} sessions had >20% error rate`,
                suggested_fix: 'Review session contexts; may indicate environmental or configuration issues',
                priority: 8,
            });
        }
        // Sort by priority and limit
        return issues.sort((a, b) => b.priority - a.priority).slice(0, maxIssues);
    }
    /**
     * Generate actionable recommendations.
     */
    generateRecommendations(issues) {
        const maxRecs = this.config.display.max_issues_shown;
        return issues.slice(0, maxRecs).map(i => `[Priority ${i.priority}/10] ${i.name}: ${i.suggested_fix}`);
    }
    /**
     * Generate summary statistics.
     */
    generateSummary(traces, toolStats, issues) {
        const totalErrors = traces.filter(t => !t.context.success).length;
        const totalSlow = traces.filter(t => t.tool.execution_time_ms > this.slowThresholdMs).length;
        const sum = traces.reduce((acc, t) => acc + t.tool.execution_time_ms, 0);
        return {
            total_tool_calls: traces.length,
            unique_tools: toolStats.length,
            total_errors: totalErrors,
            error_rate_percent: Math.round((totalErrors / traces.length) * 10000) / 100,
            slow_operations: totalSlow,
            slow_rate_percent: Math.round((totalSlow / traces.length) * 10000) / 100,
            issues_found: issues.length,
            most_used_tool: toolStats.length > 0 ? toolStats[0].name : null,
            average_execution_time_ms: Math.round((sum / traces.length) * 100) / 100,
        };
    }
    /**
     * Get the time range of traces.
     */
    getTimeRange(traces) {
        if (traces.length === 0) {
            return { start: null, end: null };
        }
        const timestamps = traces.map(t => new Date(t.timestamp).getTime());
        const minTime = Math.min(...timestamps);
        const maxTime = Math.max(...timestamps);
        return {
            start: new Date(minTime).toISOString(),
            end: new Date(maxTime).toISOString(),
        };
    }
    /**
     * Save analysis report to file.
     *
     * @param report - The AnalysisReport to save
     * @param outputFile - Optional custom output file path
     * @returns true if saved successfully, false otherwise
     */
    saveReport(report, outputFile) {
        try {
            let outputPath;
            if (outputFile) {
                outputPath = outputFile;
            }
            else {
                const analysisDir = this.config.analysis.analysis_dir;
                if (!existsSync(analysisDir)) {
                    if (!mkdirSync(analysisDir, { recursive: true })) {
                        console.error(`[AHE] Failed to create analysis directory: ${analysisDir}`);
                        return false;
                    }
                }
                outputPath = join(analysisDir, 'latest.json');
            }
            writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf-8');
            return true;
        }
        catch (error) {
            const errMsg = error instanceof Error ? error.message : String(error);
            console.error(`[AHE] Failed to save report: ${errMsg}`);
            return false;
        }
    }
}
//# sourceMappingURL=analyzer.js.map