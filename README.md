# Claude Code AHE Plugin (TypeScript)

Agentic Harness Engineering (AHE) plugin for Claude Code. Collects tool execution traces, analyzes patterns, and generates improvement recommendations.

## Features

- **Trace Collection**: Automatic PostToolUse hook captures tool executions with input validation
- **Session Summarization**: Stop hook generates session summaries
- **Pattern Analysis**: Identify high error rates, slow operations, failed sessions
- **Actionable Recommendations**: Prioritized suggestions for improvement
- **Configurable**: All thresholds and settings configurable via environment variables
- **Input Validation**: Zod-based schema validation for hook inputs
- **Secure**: Path traversal protection for custom directories

## Installation

```bash
# Clone or copy to Claude Code plugins directory
cp -r claude-ahe-ts ~/.claude/plugins/

# Install dependencies
cd ~/.claude/plugins/claude-ahe-ts
pnpm install

# Build
pnpm build

# Run setup script
./install.sh
```

## Usage

### CLI Commands

```bash
# Analyze recent sessions
npx claude-ahe analyze [n]

# Show collection status
npx claude-ahe status

# Generate and save report
npx claude-ahe report

# Clean old traces (days)
npx claude-ahe clean [days]

# Show current configuration
npx claude-ahe config

# Help
npx claude-ahe help
```

### Skills

```
/ahe-analyze [n]    Analyze last n sessions (default: 5)
/ahe-status         Show collection status
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `AHE_COLLECTION_ENABLED` | `true` | Enable/disable trace collection |
| `AHE_TRACES_DIR` | `~/.claude-ahe/traces` | Custom traces directory |
| `AHE_ANALYSIS_DIR` | `~/.claude-ahe/analysis` | Custom analysis output directory |
| `AHE_MAX_TRACE_FILES` | `100` | Maximum trace files to keep |
| `AHE_MAX_TRACE_AGE_DAYS` | `7` | Maximum age of trace files in days |
| `AHE_TRUNCATE_CHARS` | `1000` | Maximum characters in output |
| `AHE_SLOW_THRESHOLD_MS` | `5000` | Slow operation threshold in ms |
| `AHE_LOOKBACK_SESSIONS` | `5` | Default sessions to analyze |
| `AHE_MAX_ISSUES` | `5` | Maximum issues to display |
| `AHE_DEBUG` | `false` | Enable debug logging |

## Architecture

```
claude-ahe-ts/
├── src/
│   ├── index.ts              # CLI entry point
│   ├── types/
│   │   └── index.ts          # Type definitions + Zod schemas
│   ├── lib/
│   │   ├── config.ts         # Configuration management
│   │   ├── tracer.ts         # Trace management
│   │   ├── analyzer.ts       # Analysis engine
│   │   └── utils.ts          # Utility functions
│   └── hooks/
│       ├── trace-collector.ts    # PostToolUse hook
│       └── session-summarizer.ts # Stop hook
├── skills/
│   ├── ahe-analyze/
│   │   └── SKILL.md
│   └── ahe-status/
│       └── SKILL.md
├── tests/
│   ├── config.test.ts
│   ├── utils.test.ts
│   ├── tracer.test.ts
│   └── analyzer.test.ts
├── package.json
├── tsconfig.json
└── install.sh
```

## Data Formats

### TraceData

```typescript
interface TraceData {
  timestamp: string;
  session_id: string;
  tool: {
    name: string;
    input: Record<string, unknown>;
    output: string;
    execution_time_ms: number;
  };
  context: {
    working_directory: string;
    success: boolean;
  };
}
```

### SessionSummary

```typescript
interface SessionSummary {
  session_id: string;
  timestamp: string;
  status: 'success' | 'no_traces' | 'error';
  session_info?: {
    start_time: string | null;
    end_time: string | null;
  };
  statistics: {
    total_tool_calls: number;
    unique_tools: number;
    error_count: number;
    error_rate_percent: number;
    slow_operation_count: number;
    slow_rate_percent: number;
  };
  tool_usage: Record<string, number>;
  tool_statistics: Record<string, ToolStatistics>;
  issues?: {
    errors: ErrorInfo[];
    slow_operations: SlowOperationInfo[];
  };
}
```

### AnalysisReport

```typescript
interface AnalysisReport {
  timestamp: string;
  analysis_info: {
    sessions_analyzed: number;
    total_traces: number;
    time_range: { start: string | null; end: string | null };
  };
  summary: AnalysisSummary;
  tool_statistics: ToolStats[];
  issues: Issue[];
  recommendations: string[];
}
```

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Type check
pnpm typecheck

# Run tests
pnpm test

# Run in development mode
pnpm dev
```

## Testing

The project has comprehensive test coverage:

- `config.test.ts` - Configuration loading and validation
- `utils.test.ts` - Utility functions (truncate, isError, format, etc.)
- `tracer.test.ts` - Trace collection and management
- `analyzer.test.ts` - Analysis engine

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test -- --coverage
```

## Troubleshooting

### Collection not working

1. Check if hooks are installed in `~/.claude/settings.json`
2. Verify `AHE_COLLECTION_ENABLED` is not set to `false`
3. Check trace directory permissions

### No traces collected

1. Run `npx claude-ahe status` to check configuration
2. Verify trace directory exists: `~/.claude-ahe/traces`
3. Check for errors in hook output

### Invalid input errors

1. Ensure hook input is valid JSON
2. Check Claude Code version compatibility
3. Enable debug logging: `AHE_DEBUG=true`

## Uninstallation

```bash
./uninstall.sh
```

## License

MIT