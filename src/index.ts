#!/usr/bin/env node
/**
 * Claude Code AHE Plugin - Main Entry Point
 *
 * CLI tool for analyzing Claude Code tool execution traces.
 *
 * Usage:
 *   npx claude-ahe-ts analyze        - Run analysis on recent sessions
 *   npx claude-ahe-ts status         - Show collection status
 *   npx claude-ahe-ts report         - Generate and display report
 *   npx claude-ahe-ts clean          - Clean old traces
 */

import { AHEAnalyzer } from './lib/analyzer.js';
import { TraceManager } from './lib/tracer.js';
import { getConfig, resetConfig } from './lib/config.js';

function printUsage(): void {
  const config = getConfig();

  console.log(`
Claude Code AHE Plugin - Agentic Harness Engineering

Usage:
  npx claude-ahe-ts <command> [options]

Commands:
  analyze [n]       Analyze last n sessions (default: ${config.analysis.default_lookback_sessions})
  status            Show collection status and statistics
  report            Generate and save analysis report
  clean [days]      Clean traces older than n days (default: ${config.collection.max_trace_age_days})
  config            Show current configuration
  help              Show this help message

Environment Variables:
  AHE_COLLECTION_ENABLED     Enable/disable trace collection (default: true)
  AHE_TRACES_DIR             Custom traces directory
  AHE_ANALYSIS_DIR           Custom analysis output directory
  AHE_MAX_TRACE_FILES        Maximum trace files to keep (default: ${config.collection.max_trace_files})
  AHE_SLOW_THRESHOLD_MS      Slow operation threshold in ms (default: ${config.analysis.slow_operation_threshold_ms})
  AHE_DEBUG                  Enable debug logging (default: false)

Examples:
  npx claude-ahe-ts analyze 10
  npx claude-ahe-ts status
  npx claude-ahe-ts clean 30
  AHE_COLLECTION_ENABLED=false npx claude-ahe-ts status
`);
}

async function runAnalyze(lastN?: number): Promise<void> {
  const config = getConfig();
  const n = lastN ?? config.analysis.default_lookback_sessions;

  console.log(`\n📊 Analyzing last ${n} sessions...\n`);

  const analyzer = new AHEAnalyzer();
  const report = analyzer.analyzeSessions(undefined, n);

  // Print summary
  console.log('=== Analysis Summary ===');
  console.log(`Sessions analyzed: ${report.analysis_info.sessions_analyzed}`);
  console.log(`Total traces: ${report.analysis_info.total_traces}`);
  console.log(
    `Time range: ${report.analysis_info.time_range.start || 'N/A'} to ${report.analysis_info.time_range.end || 'N/A'}`
  );
  console.log();

  console.log('=== Statistics ===');
  console.log(`Total tool calls: ${report.summary.total_tool_calls}`);
  console.log(`Unique tools: ${report.summary.unique_tools}`);
  console.log(`Error rate: ${report.summary.error_rate_percent.toFixed(2)}%`);
  console.log(`Slow operations: ${report.summary.slow_rate_percent.toFixed(2)}%`);
  console.log(`Most used tool: ${report.summary.most_used_tool || 'N/A'}`);
  console.log(`Avg execution time: ${report.summary.average_execution_time_ms.toFixed(2)}ms`);
  console.log();

  if (report.tool_statistics.length > 0) {
    console.log('=== Top Tools ===');
    const topTools = report.tool_statistics.slice(0, 5);
    for (const tool of topTools) {
      console.log(
        `  ${tool.name}: ${tool.call_count} calls, ${tool.avg_time_ms.toFixed(0)}ms avg, ${tool.error_rate_percent.toFixed(1)}% errors`
      );
    }
    console.log();
  }

  if (report.issues.length > 0) {
    console.log('=== Issues Found ===');
    for (const issue of report.issues.slice(0, config.display.max_issues_shown)) {
      console.log(`  [${issue.severity.toUpperCase()}] ${issue.name}`);
      console.log(`    Occurrences: ${issue.occurrences}`);
      console.log(`    Fix: ${issue.suggested_fix}`);
    }
    console.log();
  }

  if (report.recommendations.length > 0) {
    console.log('=== Recommendations ===');
    for (const rec of report.recommendations) {
      console.log(`  • ${rec}`);
    }
  }
}

async function runStatus(): Promise<void> {
  const config = getConfig();

  console.log('\n📈 Collection Status\n');

  console.log(`Collection: ${config.collection.enabled ? '✅ ENABLED' : '❌ DISABLED'}`);
  console.log(`Traces directory: ${config.collection.trace_dir}`);
  console.log(`Analysis directory: ${config.analysis.analysis_dir}`);
  console.log();

  const manager = new TraceManager();

  try {
    const traces = manager.loadTraces(undefined, 100);
    const summaries = manager.loadSummaries(undefined, 100);

    console.log('=== Recent Activity ===');
    console.log(`Total traces collected: ${traces.length}`);
    console.log(`Sessions recorded: ${summaries.length}`);

    if (summaries.length > 0) {
      const lastSession = summaries[summaries.length - 1];
      console.log(`\nLast session (${lastSession.session_id}):`);
      if (lastSession.session_info?.start_time && lastSession.session_info?.end_time) {
        const start = new Date(lastSession.session_info.start_time).getTime();
        const end = new Date(lastSession.session_info.end_time).getTime();
        console.log(`  Duration: ${((end - start) / 1000).toFixed(1)}s`);
      }
      console.log(`  Tool calls: ${lastSession.statistics.total_tool_calls}`);
      console.log(
        `  Errors: ${lastSession.statistics.error_count} (${lastSession.statistics.error_rate_percent.toFixed(1)}%)`
      );
    }

    // Tool usage breakdown
    const toolCounts: Record<string, number> = {};
    for (const trace of traces) {
      toolCounts[trace.tool.name] = (toolCounts[trace.tool.name] || 0) + 1;
    }

    const sortedTools = Object.entries(toolCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    if (sortedTools.length > 0) {
      console.log('\n=== Top Tools ===');
      for (const [name, count] of sortedTools) {
        console.log(`  ${name}: ${count}`);
      }
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.log(`No traces collected yet. (${errMsg})`);
  }
}

async function runReport(): Promise<void> {
  console.log('\n📄 Generating report...\n');

  const analyzer = new AHEAnalyzer();
  const report = analyzer.analyzeSessions(undefined, 10);

  const saved = analyzer.saveReport(report);
  if (saved) {
    const config = getConfig();
    console.log(`✅ Report saved to ${config.analysis.analysis_dir}/latest.json`);
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log('❌ Failed to save report');
  }
}

async function runClean(days?: number): Promise<void> {
  const config = getConfig();
  const maxDays = days ?? config.collection.max_trace_age_days;

  console.log(`\n🧹 Cleaning traces older than ${maxDays} days...\n`);

  const manager = new TraceManager();
  const deleted = manager.cleanupOldTraces(config.collection.max_trace_files, maxDays);

  console.log(`✅ Cleaned ${deleted} old traces`);
}

async function runConfig(): Promise<void> {
  const config = getConfig();

  console.log('\n⚙️  Current Configuration\n');
  console.log(JSON.stringify(config, null, 2));
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';

  switch (command) {
    case 'analyze': {
      const n = args[1] ? parseInt(args[1], 10) : undefined;
      if (args[1] && isNaN(n!)) {
        console.error('Invalid number provided');
        process.exit(1);
      }
      await runAnalyze(n);
      break;
    }

    case 'status':
      await runStatus();
      break;

    case 'report':
      await runReport();
      break;

    case 'clean': {
      const days = args[1] ? parseInt(args[1], 10) : undefined;
      if (args[1] && isNaN(days!)) {
        console.error('Invalid number of days provided');
        process.exit(1);
      }
      await runClean(days);
      break;
    }

    case 'config':
      await runConfig();
      break;

    case 'help':
    case '--help':
    case '-h':
    default:
      printUsage();
      break;
  }
}

main().catch(error => {
  const errMsg = error instanceof Error ? error.message : String(error);
  console.error('Fatal error:', errMsg);
  process.exit(1);
});
