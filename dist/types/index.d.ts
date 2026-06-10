/**
 * Type definitions for Claude AHE Plugin
 */
import { z } from 'zod';
export interface TraceData {
    timestamp: string;
    session_id: string;
    tool: ToolInfo;
    context: ExecutionContext;
}
export interface ToolInfo {
    name: string;
    input: Record<string, unknown>;
    output: string;
    execution_time_ms: number;
}
export interface ExecutionContext {
    working_directory: string;
    success: boolean;
}
export interface SessionSummary {
    session_id: string;
    timestamp: string;
    status: 'success' | 'no_traces' | 'error';
    session_info?: {
        start_time: string | null;
        end_time: string | null;
    };
    statistics: SessionStatistics;
    tool_usage: Record<string, number>;
    tool_statistics: Record<string, ToolStatistics>;
    issues?: {
        errors: ErrorInfo[];
        slow_operations: SlowOperationInfo[];
    };
}
export interface SessionStatistics {
    total_tool_calls: number;
    unique_tools: number;
    error_count: number;
    error_rate_percent: number;
    slow_operation_count: number;
    slow_rate_percent: number;
}
export interface ToolStatistics {
    count: number;
    avg_time_ms: number;
    max_time_ms: number;
    min_time_ms: number;
}
export interface ErrorInfo {
    tool: string;
    timestamp: string;
    output_preview: string;
}
export interface SlowOperationInfo {
    tool: string;
    execution_time_ms: number;
    timestamp: string;
}
export interface AnalysisReport {
    timestamp: string;
    analysis_info: {
        sessions_analyzed: number;
        total_traces: number;
        time_range: {
            start: string | null;
            end: string | null;
        };
    };
    summary: AnalysisSummary;
    tool_statistics: ToolStats[];
    issues: Issue[];
    recommendations: string[];
}
export interface AnalysisSummary {
    total_tool_calls: number;
    unique_tools: number;
    total_errors: number;
    error_rate_percent: number;
    slow_operations: number;
    slow_rate_percent: number;
    issues_found: number;
    most_used_tool: string | null;
    average_execution_time_ms: number;
}
export interface ToolStats {
    name: string;
    call_count: number;
    total_time_ms: number;
    avg_time_ms: number;
    max_time_ms: number;
    min_time_ms: number;
    error_count: number;
    error_rate_percent: number;
}
export interface Issue {
    name: string;
    occurrences: number;
    severity: 'high' | 'medium' | 'low';
    root_cause: string;
    suggested_fix: string;
    priority: number;
}
export interface AHEConfig {
    collection: {
        enabled: boolean;
        max_trace_files: number;
        truncate_output_chars: number;
        trace_dir: string;
        max_trace_age_days: number;
    };
    analysis: {
        default_lookback_sessions: number;
        slow_operation_threshold_ms: number;
        error_keywords: string[];
        analysis_dir: string;
    };
    display: {
        show_timestamps: boolean;
        show_execution_times: boolean;
        max_issues_shown: number;
    };
}
/**
 * Zod schema for PostToolUseEvent validation
 */
export declare const PostToolUseEventSchema: z.ZodObject<{
    tool_name: z.ZodString;
    tool_input: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    tool_output: z.ZodUnknown;
    execution_time_ms: z.ZodNumber;
    working_directory: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type PostToolUseEvent = z.infer<typeof PostToolUseEventSchema>;
/**
 * Zod schema for StopEvent validation
 */
export declare const StopEventSchema: z.ZodObject<{
    session_id: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type StopEvent = z.infer<typeof StopEventSchema>;
//# sourceMappingURL=index.d.ts.map