/**
 * Configuration Management for Claude AHE Plugin
 */
import { z } from 'zod';
/**
 * Configuration schema using Zod for validation
 */
export declare const AHEConfigSchema: z.ZodObject<{
    collection: z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        max_trace_files: z.ZodDefault<z.ZodNumber>;
        truncate_output_chars: z.ZodDefault<z.ZodNumber>;
        trace_dir: z.ZodDefault<z.ZodString>;
        max_trace_age_days: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strip>;
    analysis: z.ZodObject<{
        default_lookback_sessions: z.ZodDefault<z.ZodNumber>;
        slow_operation_threshold_ms: z.ZodDefault<z.ZodNumber>;
        error_keywords: z.ZodDefault<z.ZodArray<z.ZodString>>;
        analysis_dir: z.ZodDefault<z.ZodString>;
    }, z.core.$strip>;
    display: z.ZodObject<{
        show_timestamps: z.ZodDefault<z.ZodBoolean>;
        show_execution_times: z.ZodDefault<z.ZodBoolean>;
        max_issues_shown: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strip>;
}, z.core.$strip>;
export type AHEConfig = z.infer<typeof AHEConfigSchema>;
/**
 * Load configuration from environment variables and defaults
 */
export declare function loadConfig(): AHEConfig;
/**
 * Get the global configuration instance
 */
export declare function getConfig(): AHEConfig;
/**
 * Reset configuration (useful for testing)
 */
export declare function resetConfig(): void;
//# sourceMappingURL=config.d.ts.map