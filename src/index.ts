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

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { AHEAnalyzer } from './lib/analyzer.js';
import { TraceManager } from './lib/tracer.js';
import { getConfig, resetConfig } from './lib/config.js';

// Get version from package.json
function getVersion(): string {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const packageJsonPath = join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    return packageJson.version;
  } catch {
    return 'unknown';
  }
}

function printVersion(): void {
  console.log(`claude-ahe v${getVersion()}`);
}

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
  weekly            Show weekly activity summary
  errors            Show error analysis
  insights          Generate visual insights report
  files             Show file operations analysis
  commands          Show Bash command analysis
  patterns          Show tool usage patterns
  heatmap           Generate activity heatmap
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
  const report = await analyzer.analyzeSessions(undefined, n);

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
    const traces = await manager.loadTraces(undefined, 100);
    const summaries = await manager.loadSummaries(undefined, 100);

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
  const report = await analyzer.analyzeSessions(undefined, 10);

  const saved = await analyzer.saveReport(report);
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
  const deleted = await manager.cleanupOldTraces(config.collection.max_trace_files, maxDays);

  console.log(`✅ Cleaned ${deleted} old traces`);
}

async function runWeekly(): Promise<void> {
  const config = getConfig();
  const manager = new TraceManager();
  const traces = await manager.loadTraces(undefined, 100);

  if (traces.length === 0) {
    console.log('\n📭 No traces found\n');
    return;
  }

  console.log('\n📅 周报摘要\n');

  // Last 7 days
  const last7Days: Record<string, number> = {};
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    last7Days[dateStr] = 0;
  }

  for (const trace of traces) {
    const date = trace.timestamp.split('T')[0];
    if (last7Days[date] !== undefined) {
      last7Days[date]++;
    }
  }

  console.log('过去 7 天活动:');
  const maxCalls = Math.max(...Object.values(last7Days));
  for (const [date, calls] of Object.entries(last7Days)) {
    const bar = generateProgressBar(calls, maxCalls || 1, 20);
    const dayName = new Date(date).toLocaleDateString('zh-CN', { weekday: 'short' });
    console.log(`  ${date} (${dayName}) ${bar} ${calls}`);
  }

  const total = Object.values(last7Days).reduce((a, b) => a + b, 0);
  console.log(`\n📊 本周统计:`);
  console.log(`  总调用: ${total}`);
  console.log(`  日均: ${Math.round(total / 7)}`);
  console.log(`  活跃天数: ${Object.values(last7Days).filter(v => v > 0).length}`);
}

async function runErrors(): Promise<void> {
  const manager = new TraceManager();
  const traces = await manager.loadTraces(undefined, 100);
  const errors = traces.filter(t => !t.context.success);

  console.log('\n⚠️ 错误详细分析\n');

  if (errors.length === 0) {
    console.log('✅ 没有发现错误！\n');
    return;
  }

  const errorRate =
    traces.length > 0 ? Math.round((errors.length / traces.length) * 10000) / 100 : 0;

  console.log(`总错误数: ${errors.length}`);
  console.log(`错误率: ${errorRate}%\n`);

  // By tool
  const byTool: Record<string, number> = {};
  for (const error of errors) {
    byTool[error.tool.name] = (byTool[error.tool.name] || 0) + 1;
  }

  console.log('按工具分类:');
  for (const [tool, count] of Object.entries(byTool).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${tool}: ${count} 次`);
  }

  console.log('\n错误样本 (最近 5 条):');
  for (const sample of errors.slice(0, 5)) {
    console.log(`  [${sample.timestamp}] ${sample.tool.name}`);
    const output =
      typeof sample.tool.output === 'string'
        ? sample.tool.output
        : JSON.stringify(sample.tool.output);
    console.log(`    输出: ${output.substring(0, 100)}...`);
    console.log();
  }
}

async function runInsights(): Promise<void> {
  const manager = new TraceManager();
  const traces = await manager.loadTraces(undefined, 100);

  if (traces.length === 0) {
    console.log('\n📭 No traces found\n');
    return;
  }

  // Meta
  const timestamps = traces.map(t => t.timestamp).sort();
  const sessions = new Set(traces.map(t => t.session_id));
  const projects = new Set(traces.map(t => t.context.working_directory));

  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║           Claude Code Trace Analysis Report                  ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  console.log('📊 概览');
  console.log('─'.repeat(50));
  console.log(`  总调用数: ${traces.length}`);
  console.log(`  会话数: ${sessions.size}`);
  console.log(`  项目数: ${projects.size}`);
  console.log(
    `  时间范围: ${timestamps[0]?.split('T')[0] || 'N/A'} ~ ${timestamps[timestamps.length - 1]?.split('T')[0] || 'N/A'}\n`
  );

  // Tools
  const toolCounts: Record<string, { count: number; success: number }> = {};
  for (const trace of traces) {
    const tool = trace.tool.name;
    if (!toolCounts[tool]) {
      toolCounts[tool] = { count: 0, success: 0 };
    }
    toolCounts[tool].count++;
    if (trace.context.success) {
      toolCounts[tool].success++;
    }
  }

  const toolsSorted = Object.entries(toolCounts).sort((a, b) => b[1].count - a[1].count);
  const topTool = toolsSorted[0];

  console.log('💡 洞察');
  console.log('─'.repeat(50));
  if (topTool) {
    const successRate = Math.round((topTool[1].success / topTool[1].count) * 100);
    console.log(`  🏆 最常用工具: ${topTool[0]} (${topTool[1].count} 次, ${successRate}% 成功率)`);
  }

  // Projects
  const projectCounts: Record<string, number> = {};
  for (const trace of traces) {
    const project = trace.context.working_directory.split('/').pop() || 'unknown';
    projectCounts[project] = (projectCounts[project] || 0) + 1;
  }
  const topProject = Object.entries(projectCounts).sort((a, b) => b[1] - a[1])[0];
  if (topProject) {
    console.log(`  📁 最活跃项目: ${topProject[0]} (${topProject[1]} 次调用)`);
  }

  // Time
  const hourCounts: Record<number, number> = {};
  for (const trace of traces) {
    const hour = new Date(trace.timestamp).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  }
  const peakHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
  if (peakHour) {
    console.log(`  ⏰ 最活跃时段: ${peakHour[0]}:00 (${peakHour[1]} 次调用)`);
  }

  // Errors
  const errors = traces.filter(t => !t.context.success);
  if (errors.length > 0) {
    const errorRate = Math.round((errors.length / traces.length) * 10000) / 100;
    console.log(`  ⚠️ 错误率: ${errorRate}% (${errors.length} 次失败)`);
  }
  console.log();

  // Tools breakdown
  console.log('🔧 工具使用统计');
  console.log('─'.repeat(50));
  for (const [tool, data] of toolsSorted) {
    const bar = generateProgressBar(data.count, traces.length, 20);
    const successRate = Math.round((data.success / data.count) * 100);
    console.log(`  ${tool.padEnd(15)} ${bar} ${data.count} (${successRate}%)`);
  }
  console.log();

  // Projects breakdown
  console.log('📁 项目活动');
  console.log('─'.repeat(50));
  const projectsSorted = Object.entries(projectCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  for (const [project, count] of projectsSorted) {
    const bar = generateProgressBar(count, traces.length, 20);
    console.log(`  ${project.substring(0, 20).padEnd(20)} ${bar} ${count}`);
  }
  console.log();

  // Time distribution
  console.log('⏰ 时间分布 (24h)');
  console.log('─'.repeat(50));
  const maxHour = Math.max(...Object.values(hourCounts));
  for (let h = 0; h < 24; h++) {
    const count = hourCounts[h] || 0;
    if (count > 0) {
      const bar = generateProgressBar(count, maxHour, 20);
      console.log(`  ${String(h).padStart(2, '0')}:00 ${bar} ${count}`);
    }
  }
}

function generateProgressBar(value: number, max: number, width: number): string {
  const filled = Math.round((value / max) * width);
  const empty = width - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

async function runFiles(): Promise<void> {
  const manager = new TraceManager();
  const traces = await manager.loadTraces(undefined, 100);

  if (traces.length === 0) {
    console.log('\n📭 No traces found\n');
    return;
  }

  console.log('\n📄 文件操作分析\n');

  // File operations by type
  const readFiles: Record<string, number> = {};
  const editFiles: Record<string, number> = {};
  const writeFiles: Record<string, number> = {};
  const fileTypes: Record<string, number> = {};

  for (const trace of traces) {
    const filePath = trace.tool.input.file_path as string;
    if (!filePath) continue;

    // Extract filename
    const fileName = filePath.split('/').pop() || filePath;
    const ext = filePath.split('.').pop() || 'unknown';

    switch (trace.tool.name) {
      case 'Read':
        readFiles[fileName] = (readFiles[fileName] || 0) + 1;
        fileTypes[ext] = (fileTypes[ext] || 0) + 1;
        break;
      case 'Edit':
        editFiles[fileName] = (editFiles[fileName] || 0) + 1;
        fileTypes[ext] = (fileTypes[ext] || 0) + 1;
        break;
      case 'Write':
        writeFiles[fileName] = (writeFiles[fileName] || 0) + 1;
        fileTypes[ext] = (fileTypes[ext] || 0) + 1;
        break;
    }
  }

  // Most read files
  console.log('📖 最常读取的文件:');
  const topRead = Object.entries(readFiles)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  for (const [file, count] of topRead) {
    console.log(`  ${file.substring(0, 40).padEnd(40)} ${count} 次`);
  }

  // Most edited files
  console.log('\n✏️ 最常编辑的文件:');
  const topEdit = Object.entries(editFiles)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  for (const [file, count] of topEdit) {
    console.log(`  ${file.substring(0, 40).padEnd(40)} ${count} 次`);
  }

  // Most written files
  console.log('\n📝 最常写入的文件:');
  const topWrite = Object.entries(writeFiles)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  for (const [file, count] of topWrite) {
    console.log(`  ${file.substring(0, 40).padEnd(40)} ${count} 次`);
  }

  // File types
  console.log('\n📁 文件类型分布:');
  const totalFiles = Object.values(fileTypes).reduce((a, b) => a + b, 0);
  const topTypes = Object.entries(fileTypes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  for (const [ext, count] of topTypes) {
    const bar = generateProgressBar(count, totalFiles, 20);
    console.log(`  .${ext.padEnd(8)} ${bar} ${count}`);
  }
}

async function runCommands(): Promise<void> {
  const manager = new TraceManager();
  const traces = await manager.loadTraces(undefined, 100);

  if (traces.length === 0) {
    console.log('\n📭 No traces found\n');
    return;
  }

  console.log('\n💻 Bash 命令分析\n');

  const commandTypes: Record<string, number> = {};
  const commandSamples: Record<string, string[]> = {};
  const gitCommands: Record<string, number> = {};

  for (const trace of traces) {
    if (trace.tool.name !== 'Bash') continue;
    const cmd = trace.tool.input.command as string;
    if (!cmd) continue;

    // Extract first word
    const firstWord = cmd.trim().split(/\s+/)[0];
    commandTypes[firstWord] = (commandTypes[firstWord] || 0) + 1;

    // Store sample
    if (!commandSamples[firstWord]) commandSamples[firstWord] = [];
    if (commandSamples[firstWord].length < 3) {
      commandSamples[firstWord].push(cmd.substring(0, 60));
    }

    // Git subcommands
    if (firstWord === 'git') {
      const gitMatch = cmd.match(/git\s+(\w+)/);
      if (gitMatch) {
        gitCommands[gitMatch[1]] = (gitCommands[gitMatch[1]] || 0) + 1;
      }
    }
  }

  // Command types
  console.log('🔧 命令类型分布:');
  const total = Object.values(commandTypes).reduce((a, b) => a + b, 0);
  const topCommands = Object.entries(commandTypes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);
  for (const [cmd, count] of topCommands) {
    const bar = generateProgressBar(count, total, 15);
    console.log(`  ${cmd.padEnd(12)} ${bar} ${count}`);
  }

  // Git subcommands
  if (Object.keys(gitCommands).length > 0) {
    console.log('\n📦 Git 子命令分布:');
    for (const [subcmd, count] of Object.entries(gitCommands).sort((a, b) => b[1] - a[1])) {
      console.log(`  git ${subcmd}: ${count} 次`);
    }
  }

  // Sample commands
  console.log('\n📝 命令示例:');
  for (const [cmd, samples] of Object.entries(commandSamples).slice(0, 5)) {
    console.log(`\n  ${cmd}:`);
    for (const sample of samples) {
      console.log(`    $ ${sample}${sample.length >= 60 ? '...' : ''}`);
    }
  }
}

async function runPatterns(): Promise<void> {
  const manager = new TraceManager();
  const traces = await manager.loadTraces(undefined, 100);

  if (traces.length === 0) {
    console.log('\n📭 No traces found\n');
    return;
  }

  console.log('\n🔄 工具使用模式分析\n');

  // Group by session
  const sessionTools: Record<string, string[]> = {};
  for (const trace of traces) {
    if (!sessionTools[trace.session_id]) {
      sessionTools[trace.session_id] = [];
    }
    sessionTools[trace.session_id].push(trace.tool.name);
  }

  // Tool sequences (2-grams)
  const sequences: Record<string, number> = {};
  for (const tools of Object.values(sessionTools)) {
    for (let i = 0; i < tools.length - 1; i++) {
      const seq = `${tools[i]} → ${tools[i + 1]}`;
      sequences[seq] = (sequences[seq] || 0) + 1;
    }
  }

  console.log('🔗 常见工具序列 (Top 10):');
  const topSequences = Object.entries(sequences)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  for (const [seq, count] of topSequences) {
    console.log(`  ${seq}: ${count} 次`);
  }

  // Edit patterns
  console.log('\n✏️ 编辑模式分析:');
  let totalEdits = 0;
  let replaceAllCount = 0;

  for (const trace of traces) {
    if (trace.tool.name !== 'Edit') continue;
    totalEdits++;
    if (trace.tool.input.replace_all) {
      replaceAllCount++;
    }
  }

  if (totalEdits > 0) {
    const replaceAllRate = Math.round((replaceAllCount / totalEdits) * 100);
    console.log(`  总编辑次数: ${totalEdits}`);
    console.log(`  批量替换 (replace_all): ${replaceAllCount} (${replaceAllRate}%)`);
    console.log(`  单次替换: ${totalEdits - replaceAllCount} (${100 - replaceAllRate}%)`);
  }

  // Session efficiency
  console.log('\n📊 会话效率分析:');
  const sessionLengths = Object.values(sessionTools).map(t => t.length);
  const avgLength = sessionLengths.reduce((a, b) => a + b, 0) / sessionLengths.length;
  const maxLength = Math.max(...sessionLengths);
  const minLength = Math.min(...sessionLengths);

  console.log(`  平均每会话调用: ${avgLength.toFixed(1)} 次`);
  console.log(`  最大会话调用: ${maxLength} 次`);
  console.log(`  最小会话调用: ${minLength} 次`);

  // Project-tool matrix
  console.log('\n📈 项目-工具矩阵:');
  const projectTools: Record<string, Record<string, number>> = {};

  for (const trace of traces) {
    const project = trace.context.working_directory.split('/').pop() || 'unknown';
    const tool = trace.tool.name;

    if (!projectTools[project]) projectTools[project] = {};
    projectTools[project][tool] = (projectTools[project][tool] || 0) + 1;
  }

  const topProjects = Object.entries(projectTools)
    .sort(
      (a, b) =>
        Object.values(b[1]).reduce((x, y) => x + y, 0) -
        Object.values(a[1]).reduce((x, y) => x + y, 0)
    )
    .slice(0, 5);

  for (const [project, tools] of topProjects) {
    const topTools = Object.entries(tools)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    const toolStr = topTools.map(([t, c]) => `${t}:${c}`).join(', ');
    console.log(`  ${project.substring(0, 20).padEnd(20)} → ${toolStr}`);
  }
}

async function runHeatmap(): Promise<void> {
  const manager = new TraceManager();
  const traces = await manager.loadTraces(undefined, 100);

  if (traces.length === 0) {
    console.log('\n📭 No traces found\n');
    return;
  }

  console.log('\n🗓️ 活动热力图\n');

  // Hour x Day matrix
  const heatmap: Record<string, Record<number, number>> = {};
  const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

  for (const trace of traces) {
    const date = new Date(trace.timestamp);
    const day = date.toISOString().split('T')[0];
    const hour = date.getHours();

    if (!heatmap[day]) heatmap[day] = {};
    heatmap[day][hour] = (heatmap[day][hour] || 0) + 1;
  }

  // Get max value for scaling
  let maxVal = 0;
  for (const day of Object.values(heatmap)) {
    for (const val of Object.values(day)) {
      if (val > maxVal) maxVal = val;
    }
  }

  // Print header
  console.log('     │ 00 02 04 06 08 10 12 14 16 18 20 22');
  console.log('─────┼' + '───'.repeat(12));

  // Print each day
  const sortedDays = Object.keys(heatmap).sort();
  for (const day of sortedDays) {
    const date = new Date(day);
    const dayName = dayNames[date.getDay()];
    const hours = heatmap[day];

    let row = `${dayName} │`;
    for (let h = 0; h < 24; h += 2) {
      const val = hours[h] || 0;
      if (val === 0) {
        row += ' ░░';
      } else {
        const intensity = Math.round((val / maxVal) * 4);
        const chars = ['░░', '▓▓', '▒▒', '▒▒', '██'];
        row += ` ${chars[intensity]}`;
      }
    }
    console.log(row);
  }

  // Legend
  console.log('\n图例: ░░ 无活动  ▓▓ 低  ▒▒ 中  ██ 高');

  // Hour summary
  console.log('\n⏰ 每小时活动汇总:');
  const hourTotals: Record<number, number> = {};
  for (const day of Object.values(heatmap)) {
    for (const [hour, count] of Object.entries(day)) {
      hourTotals[parseInt(hour)] = (hourTotals[parseInt(hour)] || 0) + count;
    }
  }

  const maxHour = Math.max(...Object.values(hourTotals));
  for (let h = 0; h < 24; h++) {
    const count = hourTotals[h] || 0;
    if (count > 0) {
      const bar = generateProgressBar(count, maxHour, 20);
      console.log(`  ${String(h).padStart(2, '0')}:00 ${bar} ${count}`);
    }
  }
}

async function runConfig(): Promise<void> {
  const config = getConfig();

  console.log('\n⚙️  Current Configuration\n');
  console.log(JSON.stringify(config, null, 2));
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';

  // Handle version flag
  if (command === '--version' || command === '-v') {
    printVersion();
    return;
  }

  // Handle help flag
  if (command === '--help' || command === '-h' || command === 'help') {
    printUsage();
    return;
  }

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

    case 'weekly':
      await runWeekly();
      break;

    case 'errors':
      await runErrors();
      break;

    case 'insights':
      await runInsights();
      break;

    case 'files':
      await runFiles();
      break;

    case 'commands':
      await runCommands();
      break;

    case 'patterns':
      await runPatterns();
      break;

    case 'heatmap':
      await runHeatmap();
      break;

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
