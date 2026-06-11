# 🚀 Claude AHE Plugin (TypeScript)

[![npm version](https://img.shields.io/npm/v/claude-ahe?color=blue&label=version)](https://www.npmjs.com/package/claude-ahe)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)](https://nodejs.org/)
[![Test Coverage](https://img.shields.io/badge/coverage-84%25-brightgreen.svg)](./coverage)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue.svg)](https://www.typescriptlang.org/)

> **Agentic Harness Engineering for Claude Code** - Automatically analyze, optimize, and improve your AI coding workflows

**Claude AHE** is a powerful TypeScript plugin that transforms how you work with Claude Code. It automatically collects tool execution traces, analyzes patterns, identifies bottlenecks, and generates actionable recommendations to supercharge your AI-assisted development.

---

## ✨ Why Claude AHE?

| 🎯 Problem | 💡 Solution |
|------------|-------------|
| **Black box AI interactions** | Full visibility into every tool call, input, and output |
| **Unknown performance issues** | Automatic detection of slow operations and errors |
| **No improvement insights** | Data-driven recommendations for workflow optimization |
| **Manual debugging** | Session summaries with error patterns and root causes |

---

## 🔥 Key Features

- **📊 Trace Collection** - Automatic capture of all Claude Code tool executions with input validation
- **📈 Session Analytics** - Comprehensive statistics: error rates, slow operations, tool usage patterns
- **🔍 Pattern Analysis** - Identify high-error tools, performance bottlenecks, and failed sessions
- **💡 Smart Recommendations** - Prioritized, actionable suggestions for improvement
- **🔒 Security First** - Data redaction for sensitive information, path traversal protection
- **⚙️ Fully Configurable** - All thresholds and settings via environment variables
- **📝 TypeScript Native** - Full type safety with Zod schema validation

---

## 📦 Installation

### Quick Start

```bash
# Clone the repository
git clone https://github.com/tinylion1024/claude-ahe-plugin.git
cd claude-ahe-plugin

# Install dependencies
npm install

# Build the project
npm run build

# Run setup (configures Claude Code hooks)
./install.sh
```

### Requirements

- **Node.js** >= 18.0.0
- **npm** or **pnpm**
- **Claude Code CLI** (for hook integration)

---

## 🚀 Quick Start

### CLI Commands

```bash
# Analyze last 5 sessions
npx claude-ahe analyze

# Analyze last 10 sessions
npx claude-ahe analyze 10

# Show collection status and statistics
npx claude-ahe status

# Generate and save analysis report
npx claude-ahe report

# Clean traces older than 30 days
npx claude-ahe clean 30

# Show current configuration
npx claude-ahe config

# Display help
npx claude-ahe --help

# Show version
npx claude-ahe --version
```

### Example Output

```
📊 Analyzing last 5 sessions...

=== Analysis Summary ===
Sessions analyzed: 5
Total traces: 342
Time range: 2026-06-10T08:00:00Z to 2026-06-11T08:00:00Z

=== Statistics ===
Total tool calls: 342
Unique tools: 12
Error rate: 2.34%
Slow operations: 5.26%
Most used tool: Read
Avg execution time: 245.67ms

=== Top Tools ===
  Read: 156 calls, 120ms avg, 1.3% errors
  Write: 89 calls, 340ms avg, 2.2% errors
  Bash: 67 calls, 890ms avg, 4.5% errors

=== Recommendations ===
  • Consider caching for repeated Read operations
  • Review Bash commands for optimization opportunities
```

---

## ⚙️ Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `AHE_COLLECTION_ENABLED` | `true` | Enable/disable trace collection |
| `AHE_TRACES_DIR` | `~/.claude-ahe/traces` | Directory for trace files |
| `AHE_ANALYSIS_DIR` | `~/.claude-ahe/analysis` | Directory for analysis reports |
| `AHE_MAX_TRACE_FILES` | `100` | Maximum trace files to keep |
| `AHE_MAX_TRACE_AGE_DAYS` | `7` | Maximum age of trace files |
| `AHE_TRUNCATE_CHARS` | `1000` | Max characters in tool output |
| `AHE_SLOW_THRESHOLD_MS` | `5000` | Slow operation threshold (ms) |
| `AHE_REDACTION_ENABLED` | `true` | Enable sensitive data redaction |
| `AHE_LOG_LEVEL` | `INFO` | Log level (DEBUG, INFO, WARN, ERROR, SILENT) |

### Configuration File

Configuration is managed via environment variables. Set them in your shell profile or `.env` file:

```bash
# ~/.bashrc or ~/.zshrc
export AHE_COLLECTION_ENABLED=true
export AHE_SLOW_THRESHOLD_MS=3000
export AHE_MAX_TRACE_FILES=200
```

---

## 📁 Project Structure

```
claude-ahe-ts/
├── src/
│   ├── index.ts                  # CLI entry point
│   ├── types/
│   │   ├── index.ts              # Type definitions & Zod schemas
│   │   ├── interfaces.ts         # Interface definitions
│   │   └── errors.ts             # Custom error types
│   ├── lib/
│   │   ├── config.ts             # Configuration management
│   │   ├── tracer.ts             # Trace collection & storage
│   │   ├── analyzer.ts           # Analysis engine
│   │   ├── logger.ts             # Configurable logging
│   │   ├── utils.ts              # Utility functions
│   │   └── redaction.ts          # Sensitive data redaction
│   └── hooks/
│       ├── trace-collector.ts    # PostToolUse hook
│       └── session-summarizer.ts # Stop hook
├── tests/
│   ├── config.test.ts            # Configuration tests
│   ├── utils.test.ts             # Utility tests
│   ├── tracer.test.ts            # Trace manager tests
│   ├── analyzer.test.ts          # Analysis tests
│   ├── logger.test.ts            # Logger tests
│   └── integration/              # Integration tests
├── skills/
│   ├── ahe-analyze/              # Analyze skill
│   └── ahe-status/               # Status skill
├── typedoc.json                  # TypeDoc configuration
├── package.json
├── tsconfig.json
└── install.sh
```

---

## 🔒 Data Privacy & Security

### Automatic Data Redaction

Claude AHE automatically redacts sensitive information from traces:

- 🔑 API Keys (`sk-*`, `AKIA*`)
- 🔐 Passwords and secrets
- 📝 Bearer tokens
- 🔒 Private keys (RSA, EC, DSA)
- 🗄️ Connection strings (MongoDB, PostgreSQL, MySQL, Redis)

### Security Features

- **Path traversal protection** for custom directories
- **Input validation** with Zod schemas
- **Configurable redaction patterns**
- **No external data transmission**

---

## 📊 API Reference

### TraceData

```typescript
interface TraceData {
  timestamp: string;           // ISO 8601 timestamp
  session_id: string;          // Unique session identifier
  tool: {
    name: string;              // Tool name (Read, Write, Bash, etc.)
    input: Record<string, unknown>;
    output: string;            // Truncated tool output
    execution_time_ms: number; // Execution duration
  };
  context: {
    working_directory: string;
    success: boolean;          // Error detection result
  };
}
```

### SessionSummary

```typescript
interface SessionSummary {
  session_id: string;
  timestamp: string;
  status: 'success' | 'no_traces' | 'error';
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

Full API documentation available at [docs/api](./docs/api/) (generate with `npm run docs`).

---

## 🧪 Development

### Scripts

```bash
npm run build        # Compile TypeScript
npm run dev          # Watch mode for development
npm run test         # Run all tests
npm run test:watch   # Run tests in watch mode
npm run coverage     # Run tests with coverage report
npm run lint         # Run ESLint
npm run lint:fix     # Fix linting issues
npm run typecheck    # TypeScript type checking
npm run docs         # Generate TypeDoc documentation
npm run format       # Format code with Prettier
```

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run coverage

# Run specific test file
npm test -- --testPathPatterns logger
```

### Test Coverage

| File | Statements | Branches | Functions | Lines |
|------|------------|----------|-----------|-------|
| **Overall** | 84% | 82% | 84% | 85% |
| logger.ts | 100% | 96% | 100% | 100% |
| config.ts | 97% | 97% | 100% | 96% |
| analyzer.ts | 92% | 83% | 86% | 94% |

---

## 🐛 Troubleshooting

### Collection not working

1. Check hooks are installed in `~/.claude/settings.json`
2. Verify `AHE_COLLECTION_ENABLED` is not `false`
3. Run `npx claude-ahe status` to check configuration

### No traces collected

1. Verify trace directory exists: `ls ~/.claude-ahe/traces`
2. Check directory permissions
3. Enable debug logging: `AHE_DEBUG=true AHE_LOG_LEVEL=DEBUG`

### Invalid input errors

1. Ensure hook input is valid JSON
2. Check Claude Code version compatibility
3. Review error messages with debug mode enabled

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes with tests
4. Run tests and linting: `npm test && npm run lint`
5. Commit your changes: `git commit -m 'feat: add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Code Style

- TypeScript with strict mode
- ESLint + Prettier for formatting
- 80%+ test coverage required
- JSDoc comments for public APIs

---

## 📝 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

- [Claude Code](https://claude.ai) - The AI coding assistant this plugin enhances
- [Zod](https://zod.dev) - Runtime type validation
- [Jest](https://jestjs.io) - Testing framework

---

## 📮 Support

- **Issues**: [GitHub Issues](https://github.com/tinylion1024/claude-ahe-plugin/issues)
- **Discussions**: [GitHub Discussions](https://github.com/tinylion1024/claude-ahe-plugin/discussions)

---

<p align="center">
  <strong>Made with ❤️ for the Claude Code community</strong>
</p>
