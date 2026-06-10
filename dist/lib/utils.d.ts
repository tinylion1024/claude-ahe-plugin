/**
 * Utility functions for Claude AHE Plugin
 */
/**
 * Truncate output to avoid large trace files
 */
export declare function truncateOutput(output: any, maxLength?: number): string;
/**
 * Check if the output indicates an error
 */
export declare function isError(output: any, keywords?: string[]): boolean;
/**
 * Get the current session ID from environment or generate one
 */
export declare function getSessionId(): string;
/**
 * Ensure a directory exists, creating it if necessary
 */
export declare function ensureDir(dirPath: string): boolean;
/**
 * Get the default data directory for AHE
 */
export declare function getDataDir(): string;
/**
 * Get the traces directory
 */
export declare function getTracesDir(): string;
/**
 * Get the analysis directory
 */
export declare function getAnalysisDir(): string;
/**
 * Format duration in human-readable format
 */
export declare function formatDuration(milliseconds: number): string;
/**
 * Calculate statistics for a list of values
 */
export declare function calculateStatistics(values: number[]): {
    count: number;
    sum: number;
    min: number;
    max: number;
    avg: number;
};
/**
 * Get current timestamp in ISO format
 */
export declare function getTimestamp(): string;
//# sourceMappingURL=utils.d.ts.map