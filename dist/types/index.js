/**
 * Type definitions for Claude AHE Plugin
 */
import { z } from 'zod';
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
/**
 * Zod schema for StopEvent validation
 */
export const StopEventSchema = z.object({
    session_id: z.string().optional(),
});
//# sourceMappingURL=index.js.map