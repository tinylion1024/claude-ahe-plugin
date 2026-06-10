/**
 * Type definitions for Claude AHE Plugin
 */

import { z } from 'zod';

// ============================================================================
// Trace Types
// ============================================================================

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

// ============================================================================
// Session Summary Types
// ============================================================================

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

// ============================================================================
// Analysis Types
// ============================================================================

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
  priority: number; // 1-10
}

// ============================================================================
// Config Types
// ============================================================================

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

// ============================================================================
// Hook Event Types with Zod Schemas
// ============================================================================

/**
 * Zod schema for PostToolUseEvent validation
 */
export const PostToolUseEventSchema = z.object({
  tool_name: z.string().min(1),
  tool_input: z.record(z.string(), z.unknown()),
  tool_output: z.unknown(),
  execution_time_ms: z.number().min(0),
  working_directory: z.string().optional(),
});

export type PostToolUseEvent = z.infer<typeof PostToolUseEventSchema>;

/**
 * Zod schema for StopEvent validation
 */
export const StopEventSchema = z.object({
  session_id: z.string().optional(),
});

export type StopEvent = z.infer<typeof StopEventSchema>;
