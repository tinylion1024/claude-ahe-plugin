#!/usr/bin/env node
/**
 * Claude AHE Trace Analyzer - Advanced Analysis Tool
 *
 * Provides comprehensive analysis of Claude Code tool usage traces.
 *
 * Usage:
 *   node analyze-traces.ts              # Interactive analysis
 *   node analyze-traces.ts --report     # Generate detailed report
 *   node analyze-traces.ts --weekly     # Weekly summary
 *   node analyze-traces.ts --errors     # Error analysis
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { readdirSync } from 'fs';
import { join, basename } from 'path';
import { homedir } from 'os';

// ============================================================================
// Types
// ============================================================================

interface TraceRecord {
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

interface AnalysisResult {
  meta: {
    generated_at: string;
    total_traces: number;
    total_sessions: number;
    time_range: {
      start: string;
      end: string;
    };
  };
  tools: {
    by_name: Record<string, { count: number; success_rate: number }>;
    by_hour: Record<number, number>;
    total_calls: number;
    unique_tools: number;
  };
  projects: {
    by_name: Record<string, { calls: number; tools: Record<string, number> }>;
    total_projects: number;
  };
  sessions: {
    by_date: Record<string, number>;
    avg_calls_per_session: number;
  };
  errors: {
    total: number;
    rate: number;
    by_tool: Record<string, number>;
    samples: Array<{ timestamp: string; tool: string; output: string }>;
  };
  files: {
    read: Record<string, number>;
    edited: Record<string, number>;
    written: Record<string, number>;
  };
  insights: string[];
}

// ============================================================================
// Analyzer Class
// ============================================================================

class TraceAnalyzer {
  private tracesDir: string;
  private traces: TraceRecord[] = [];

  constructor(tracesDir?: string) {
    this.tracesDir = tracesDir || join(homedir(), '.claude-ahe', 'traces');
  }

  loadTraces(): void {
    if (!existsSync(this.tracesDir)) {
      console.error(`Traces directory not found: ${this.tracesDir}`);
      process.exit(1);
    }

    const files = readdirSync(this.tracesDir)
      .filter(f => f.endsWith('.jsonl'))
      .sort()
      .reverse(); // Most recent first

    this.traces = [];

    for (const file of files) {
      const content = readFileSync(join(this.tracesDir, file), 'utf-8');
      for (const line of content.trim().split('\n')) {
        if (line.trim()) {
          try {
            this.traces.push(JSON.parse(line));
          } catch {
            // Skip malformed lines
          }
        }
      }
    }

    console.log(`📂 Loaded ${this.traces.length} traces from ${files.length} files\n`);
  }

  analyze(): AnalysisResult {
    const result: AnalysisResult = {
      meta: this.analyzeMeta(),
      tools: this.analyzeTools(),
      projects: this.analyzeProjects(),
      sessions: this.analyzeSessions(),
      errors: this.analyzeErrors(),
      files: this.analyzeFiles(),
      insights: [],
    };

    result.insights = this.generateInsights(result);
    return result;
  }

  private analyzeMeta(): AnalysisResult['meta'] {
    const timestamps = this.traces.map(t => t.timestamp).sort();
    const sessions = new Set(this.traces.map(t => t.session_id));

    return {
      generated_at: new Date().toISOString(),
      total_traces: this.traces.length,
      total_sessions: sessions.size,
      time_range: {
        start: timestamps[0] || 'N/A',
        end: timestamps[timestamps.length - 1] || 'N/A',
      },
    };
  }

  private analyzeTools(): AnalysisResult['tools'] {
    const byName: Record<string, { count: number; success: number }> = {};
    const byHour: Record<number, number> = {};

    for (const trace of this.traces) {
      const tool = trace.tool.name;

      // By name
      if (!byName[tool]) {
        byName[tool] = { count: 0, success: 0 };
      }
      byName[tool].count++;
      if (trace.context.success) {
        byName[tool].success++;
      }

      // By hour
      const hour = new Date(trace.timestamp).getHours();
      byHour[hour] = (byHour[hour] || 0) + 1;
    }

    const byNameResult: Record<string, { count: number; success_rate: number }> = {};
    for (const [tool, data] of Object.entries(byName)) {
      byNameResult[tool] = {
        count: data.count,
        success_rate: Math.round((data.success / data.count) * 100),
      };
    }

    return {
      by_name: byNameResult,
      by_hour: byHour,
      total_calls: this.traces.length,
      unique_tools: Object.keys(byName).length,
    };
  }

  private analyzeProjects(): AnalysisResult['projects'] {
    const byName: Record<string, { calls: number; tools: Record<string, number> }> = {};

    for (const trace of this.traces) {
      const project = basename(trace.context.working_directory);
      const tool = trace.tool.name;

      if (!byName[project]) {
        byName[project] = { calls: 0, tools: {} };
      }
      byName[project].calls++;
      byName[project].tools[tool] = (byName[project].tools[tool] || 0) + 1;
    }

    return {
      by_name: byName,
      total_projects: Object.keys(byName).length,
    };
  }

  private analyzeSessions(): AnalysisResult['sessions'] {
    const byDate: Record<string, number> = {};
    const sessions: Record<string, number> = {};

    for (const trace of this.traces) {
      const date = trace.timestamp.split('T')[0];
      byDate[date] = (byDate[date] || 0) + 1;
      sessions[trace.session_id] = (sessions[trace.session_id] || 0) + 1;
    }

    const sessionCounts = Object.values(sessions);
    const avgCalls = sessionCounts.length > 0
      ? sessionCounts.reduce((a, b) => a + b, 0) / sessionCounts.length
      : 0;

    return {
      by_date: byDate,
      avg_calls_per_session: Math.round(avgCalls * 10) / 10,
    };
  }

  private analyzeErrors(): AnalysisResult['errors'] {
    const errors = this.traces.filter(t => !t.context.success);
    const byTool: Record<string, number> = {};

    for (const error of errors) {
      byTool[error.tool.name] = (byTool[error.tool.name] || 0) + 1;
    }

    const samples = errors.slice(0, 5).map(e => ({
      timestamp: e.timestamp,
      tool: e.tool.name,
      output: (e.tool.output as string).substring(0, 200),
    }));

    return {
      total: errors.length,
      rate: this.traces.length > 0
        ? Math.round((errors.length / this.traces.length) * 10000) / 100
        : 0,
      by_tool: byTool,
      samples,
    };
  }

  private analyzeFiles(): AnalysisResult['files'] {
    const read: Record<string, number> = {};
    const edited: Record<string, number> = {};
    const written: Record<string, number> = {};

    for (const trace of this.traces) {
      const filePath = trace.tool.input.file_path as string;
      if (!filePath) continue;

      const project = basename(trace.context.working_directory);
      const relativePath = filePath.includes(project)
        ? filePath.split(project)[1] || filePath
        : filePath;

      switch (trace.tool.name) {
        case 'Read':
          read[relativePath] = (read[relativePath] || 0) + 1;
          break;
        case 'Edit':
          edited[relativePath] = (edited[relativePath] || 0) + 1;
          break;
        case 'Write':
          written[relativePath] = (written[relativePath] || 0) + 1;
          break;
      }
    }

    return { read, edited, written };
  }

  private generateInsights(result: AnalysisResult): string[] {
    const insights: string[] = [];

    // Tool usage insights
    const toolsSorted = Object.entries(result.tools.by_name).sort((a, b) => b[1].count - a[1].count);
    if (toolsSorted.length > 0) {
      const topTool = toolsSorted[0];
      insights.push(`🏆 最常用工具: ${topTool[0]} (${topTool[1].count} 次, ${topTool[1].success_rate}% 成功率)`);
    }

    // Project insights
    const projectsSorted = Object.entries(result.projects.by_name).sort((a, b) => b[1].calls - a[1].calls);
    if (projectsSorted.length > 0) {
      insights.push(`📁 最活跃项目: ${projectsSorted[0][0]} (${projectsSorted[0][1].calls} 次调用)`);
    }

    // Time insights
    const peakHour = Object.entries(result.tools.by_hour).sort((a, b) => b[1] - a[1])[0];
    if (peakHour) {
      insights.push(`⏰ 最活跃时段: ${peakHour[0]}:00 (${peakHour[1]} 次调用)`);
    }

    // Error insights
    if (result.errors.rate > 0) {
      insights.push(`⚠️ 错误率: ${result.errors.rate}% (${result.errors.total} 次失败)`);
    }

    // Efficiency insights
    if (result.sessions.avg_calls_per_session > 20) {
      insights.push(`💡 高效会话: 平均每会话 ${result.sessions.avg_calls_per_session} 次调用`);
    }

    // File insights
    const topRead = Object.entries(result.files.read).sort((a, b) => b[1] - a[1])[0];
    if (topRead) {
      insights.push(`📖 最常读取: ${topRead[0]} (${topRead[1]} 次)`);
    }

    const topEdited = Object.entries(result.files.edited).sort((a, b) => b[1] - a[1])[0];
    if (topEdited) {
      insights.push(`✏️ 最常编辑: ${topEdited[0]} (${topEdited[1]} 次)`);
    }

    return insights;
  }

  // ============================================================================
  // Output Formatters
  // ============================================================================

  printSummary(result: AnalysisResult): void {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║           Claude Code Trace Analysis Report                  ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    // Meta
    console.log('📊 概览');
    console.log('─'.repeat(50));
    console.log(`  总调用数: ${result.meta.total_traces}`);
    console.log(`  会话数: ${result.meta.total_sessions}`);
    console.log(`  项目数: ${result.projects.total_projects}`);
    console.log(`  时间范围: ${result.meta.time_range.start.split('T')[0]} ~ ${result.meta.time_range.end.split('T')[0]}\n`);

    // Insights
    console.log('💡 洞察');
    console.log('─'.repeat(50));
    for (const insight of result.insights) {
      console.log(`  ${insight}`);
    }
    console.log();

    // Tools
    console.log('🔧 工具使用统计');
    console.log('─'.repeat(50));
    const toolsSorted = Object.entries(result.tools.by_name)
      .sort((a, b) => b[1].count - a[1].count);
    for (const [tool, data] of toolsSorted) {
      const bar = this.progressBar(data.count, result.tools.total_calls, 20);
      console.log(`  ${tool.padEnd(15)} ${bar} ${data.count} (${data.success_rate}%)`);
    }
    console.log();

    // Projects
    console.log('📁 项目活动');
    console.log('─'.repeat(50));
    const projectsSorted = Object.entries(result.projects.by_name)
      .sort((a, b) => b[1].calls - a[1].calls)
      .slice(0, 10);
    for (const [project, data] of projectsSorted) {
      const bar = this.progressBar(data.calls, result.meta.total_traces, 20);
      console.log(`  ${project.substring(0, 20).padEnd(20)} ${bar} ${data.calls}`);
    }
    console.log();

    // Time distribution
    console.log('⏰ 时间分布 (24h)');
    console.log('─'.repeat(50));
    const maxHour = Math.max(...Object.values(result.tools.by_hour));
    for (let h = 0; h < 24; h++) {
      const count = result.tools.by_hour[h] || 0;
      if (count > 0) {
        const bar = this.progressBar(count, maxHour, 20);
        console.log(`  ${String(h).padStart(2, '0')}:00 ${bar} ${count}`);
      }
    }
    console.log();

    // Errors
    if (result.errors.total > 0) {
      console.log('⚠️ 错误分析');
      console.log('─'.repeat(50));
      console.log(`  总错误: ${result.errors.total} (${result.errors.rate}%)`);
      for (const [tool, count] of Object.entries(result.errors.by_tool)) {
        console.log(`  ${tool}: ${count} 次`);
      }
      console.log();
    }

    // Hot files
    console.log('📄 热门文件');
    console.log('─'.repeat(50));
    const topRead = Object.entries(result.files.read)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    if (topRead.length > 0) {
      console.log('  最常读取:');
      for (const [file, count] of topRead) {
        console.log(`    ${file.substring(0, 40)} (${count})`);
      }
    }

    const topEdited = Object.entries(result.files.edited)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    if (topEdited.length > 0) {
      console.log('  最常编辑:');
      for (const [file, count] of topEdited) {
        console.log(`    ${file.substring(0, 40)} (${count})`);
      }
    }
  }

  printWeeklySummary(result: AnalysisResult): void {
    console.log('\n📅 周报摘要\n');

    // Last 7 days
    const last7Days: Record<string, number> = {};
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      last7Days[dateStr] = result.sessions.by_date[dateStr] || 0;
    }

    console.log('过去 7 天活动:');
    const maxCalls = Math.max(...Object.values(last7Days));
    for (const [date, calls] of Object.entries(last7Days)) {
      const bar = this.progressBar(calls, maxCalls || 1, 20);
      const dayName = new Date(date).toLocaleDateString('zh-CN', { weekday: 'short' });
      console.log(`  ${date} (${dayName}) ${bar} ${calls}`);
    }

    console.log(`\n📊 本周统计:`);
    console.log(`  总调用: ${Object.values(last7Days).reduce((a, b) => a + b, 0)}`);
    console.log(`  日均: ${Math.round(Object.values(last7Days).reduce((a, b) => a + b, 0) / 7)}`);
    console.log(`  活跃天数: ${Object.values(last7Days).filter(v => v > 0).length}`);
  }

  printErrorAnalysis(result: AnalysisResult): void {
    console.log('\n⚠️ 错误详细分析\n');

    if (result.errors.total === 0) {
      console.log('✅ 没有发现错误！');
      return;
    }

    console.log(`总错误数: ${result.errors.total}`);
    console.log(`错误率: ${result.errors.rate}%\n`);

    console.log('按工具分类:');
    for (const [tool, count] of Object.entries(result.errors.by_tool).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${tool}: ${count} 次`);
    }

    console.log('\n错误样本 (最近 5 条):');
    for (const sample of result.errors.samples) {
      console.log(`  [${sample.timestamp}] ${sample.tool}`);
      console.log(`    输出: ${sample.output.substring(0, 100)}...`);
      console.log();
    }
  }

  saveReport(result: AnalysisResult, outputPath?: string): void {
    const path = outputPath || join(homedir(), '.claude-ahe', 'analysis', 'detailed-report.json');
    const dir = path.substring(0, path.lastIndexOf('/'));

    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    writeFileSync(path, JSON.stringify(result, null, 2));
    console.log(`\n💾 报告已保存: ${path}`);
  }

  private progressBar(value: number, max: number, width: number): string {
    const filled = Math.round((value / max) * width);
    const empty = width - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }
}

// ============================================================================
// CLI
// ============================================================================

function main(): void {
  const args = process.argv.slice(2);
  const analyzer = new TraceAnalyzer();

  analyzer.loadTraces();
  const result = analyzer.analyze();

  // Handle different modes
  if (args.includes('--weekly') || args.includes('-w')) {
    analyzer.printWeeklySummary(result);
  } else if (args.includes('--errors') || args.includes('-e')) {
    analyzer.printErrorAnalysis(result);
  } else if (args.includes('--report') || args.includes('-r')) {
    analyzer.printSummary(result);
    analyzer.saveReport(result);
  } else if (args.includes('--json')) {
    console.log(JSON.stringify(result, null, 2));
  } else if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Claude AHE Trace Analyzer

用法:
  node analyze-traces.ts [options]

选项:
  --report, -r     生成详细报告并保存
  --weekly, -w     显示周报摘要
  --errors, -e     显示错误分析
  --json           输出 JSON 格式
  --help, -h       显示帮助信息

示例:
  node analyze-traces.ts              # 交互式分析
  node analyze-traces.ts --weekly     # 周报
  node analyze-traces.ts --errors     # 错误分析
  node analyze-traces.ts --report     # 完整报告
    `);
  } else {
    // Default: show summary
    analyzer.printSummary(result);
  }
}

main();
