# AHE Analyze Skill

Analyze collected Claude Code traces and generate improvement recommendations.

## Usage

```
/ahe-analyze [n]
```

- `n` - Number of recent sessions to analyze (default: from config, usually 5)

## What It Does

1. Loads trace data from recent Claude Code sessions
2. Analyzes tool usage patterns and statistics
3. Identifies issues: high error rates, slow operations, failed sessions
4. Generates actionable recommendations for improvement
5. Saves analysis report for review

## Output

- Session statistics (tool calls, error rates, timing)
- Tool usage breakdown with performance metrics
- Identified issues with severity levels
- Prioritized recommendations

## Configuration

The analysis uses settings from environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `AHE_LOOKBACK_SESSIONS` | 5 | Default number of sessions to analyze |
| `AHE_SLOW_THRESHOLD_MS` | 5000 | Threshold for slow operations (ms) |
| `AHE_MAX_ISSUES` | 5 | Maximum issues to display |

## Example

```
/ahe-analyze 10

📊 Analyzing last 10 sessions...

=== Analysis Summary ===
Sessions analyzed: 10
Total traces: 847
Time range: 2026-06-01T10:00:00Z to 2026-06-09T15:30:00Z

=== Statistics ===
Total tool calls: 847
Unique tools: 23
Error rate: 3.42%
Slow operations: 12.15%
Most used tool: Read
Avg execution time: 234.56ms

=== Top Tools ===
  Read: 234 calls, 150ms avg, 1.2% errors
  Bash: 198 calls, 350ms avg, 5.5% errors
  Write: 156 calls, 200ms avg, 0.6% errors

=== Issues Found ===
[HIGH] High Error Rate: Bash
  Occurrences: 11
  Fix: Review and validate inputs for Bash; check for missing dependencies

[MEDIUM] Slow Operations: Grep
  Occurrences: 8
  Fix: Consider adding pagination, caching, or optimizing the operation

=== Recommendations ===
  • [Priority 8/10] High Error Rate: Bash: Review and validate inputs for Bash; check for missing dependencies or incorrect parameters
  • [Priority 7/10] Slow Operations: Grep: Consider adding pagination, caching, or optimizing the operation
```

## Environment

- `AHE_TRACES_DIR` - Custom traces directory (optional)
- `AHE_ANALYSIS_DIR` - Custom output directory (optional)