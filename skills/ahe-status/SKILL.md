# AHE Status Skill

Show current collection status and quick statistics.

## Usage

```
/ahe-status
```

## What It Does

1. Shows if trace collection is enabled
2. Displays trace storage locations
3. Shows recent activity summary
4. Lists top tools by usage count
5. Shows last session details

## Output

- Collection status (enabled/disabled)
- Storage paths from configuration
- Total traces and sessions count
- Top 10 tools by frequency
- Last session summary with duration and error rate

## Configuration Display

Also shows current configuration values when run.

## Example

```
/ahe-status

📈 Collection Status

Collection: ✅ ENABLED
Traces directory: ~/.claude-ahe/traces
Analysis directory: ~/.claude-ahe/analysis

=== Recent Activity ===
Total traces collected: 1247
Sessions recorded: 15

Last session (session_20260609_153000):
  Duration: 342.5s
  Tool calls: 89
  Errors: 3 (3.4%)

=== Top Tools ===
  Read: 234
  Bash: 198
  Edit: 156
  Write: 89
  Grep: 67
  Glob: 45
  Task: 34
  WebFetch: 23
  Agent: 18
  WebSearch: 12
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `AHE_COLLECTION_ENABLED` | Set to `false` to disable collection |
| `AHE_TRACES_DIR` | Custom traces directory |
| `AHE_DEBUG` | Set to `true` for debug output |