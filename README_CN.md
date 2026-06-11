# 🚀 Claude AHE Plugin (TypeScript)

[![npm version](https://img.shields.io/npm/v/claude-ahe?color=blue&label=version)](https://www.npmjs.com/package/claude-ahe)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)](https://nodejs.org/)
[![Test Coverage](https://img.shields.io/badge/coverage-84%25-brightgreen.svg)](./coverage)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue.svg)](https://www.typescriptlang.org/)

English | **中文文档**

> **Claude Code 智能辅助工程插件** - 自动分析、优化和改进你的 AI 编码工作流

**Claude AHE** 是一个强大的 TypeScript 插件，可以彻底改变你使用 Claude Code 的方式。它自动收集工具执行轨迹，分析使用模式，识别性能瓶颈，并生成可操作的建议，让你的 AI 辅助开发如虎添翼。

---

## ✨ 为什么选择 Claude AHE？

| 🎯 问题 | 💡 解决方案 |
|---------|-------------|
| **AI 交互是黑盒** | 完整记录每个工具调用的输入和输出 |
| **不知道性能问题在哪** | 自动检测慢操作和错误 |
| **没有改进建议** | 基于数据的优化建议 |
| **手动调试太累** | 自动生成会话摘要和错误分析 |

---

## 🔥 核心功能

- **📊 轨迹收集** - 自动捕获所有 Claude Code 工具执行，支持输入验证
- **📈 会话分析** - 全面的统计数据：错误率、慢操作、工具使用模式
- **🔍 模式分析** - 识别高错误率工具、性能瓶颈和失败会话
- **💡 智能建议** - 优先级排序的可操作改进建议
- **🔒 安全优先** - 敏感数据自动脱敏、路径遍历保护
- **⚙️ 完全可配置** - 所有阈值和设置都可通过环境变量调整
- **📝 TypeScript 原生** - 使用 Zod 进行完整的类型安全验证

---

## 📦 安装

### 快速开始

```bash
# 克隆仓库
git clone https://github.com/tinylion1024/claude-ahe-plugin.git
cd claude-ahe-plugin

# 安装依赖
npm install

# 构建项目
npm run build

# 运行安装脚本（配置 Claude Code 钩子）
./install.sh
```

### 系统要求

- **Node.js** >= 18.0.0
- **npm** 或 **pnpm**
- **Claude Code CLI**（用于钩子集成）

---

## 🚀 快速使用

### CLI 命令

```bash
# 分析最近 5 个会话
npx claude-ahe analyze

# 分析最近 10 个会话
npx claude-ahe analyze 10

# 显示收集状态和统计信息
npx claude-ahe status

# 生成并保存分析报告
npx claude-ahe report

# 清理 30 天前的轨迹
npx claude-ahe clean 30

# 显示当前配置
npx claude-ahe config

# 显示帮助
npx claude-ahe --help

# 显示版本
npx claude-ahe --version
```

### 示例输出

```
📊 正在分析最近 5 个会话...

=== 分析摘要 ===
分析会话数: 5
总轨迹数: 342
时间范围: 2026-06-10T08:00:00Z 至 2026-06-11T08:00:00Z

=== 统计信息 ===
工具调用总数: 342
使用工具种类: 12
错误率: 2.34%
慢操作: 5.26%
最常用工具: Read
平均执行时间: 245.67ms

=== 热门工具 ===
  Read: 156 次调用, 平均 120ms, 错误率 1.3%
  Write: 89 次调用, 平均 340ms, 错误率 2.2%
  Bash: 67 次调用, 平均 890ms, 错误率 4.5%

=== 优化建议 ===
  • 建议对重复的 Read 操作添加缓存
  • 检查 Bash 命令是否有优化空间
```

---

## ⚙️ 配置

### 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `AHE_COLLECTION_ENABLED` | `true` | 启用/禁用轨迹收集 |
| `AHE_TRACES_DIR` | `~/.claude-ahe/traces` | 轨迹文件存储目录 |
| `AHE_ANALYSIS_DIR` | `~/.claude-ahe/analysis` | 分析报告存储目录 |
| `AHE_MAX_TRACE_FILES` | `100` | 最大保留轨迹文件数 |
| `AHE_MAX_TRACE_AGE_DAYS` | `7` | 轨迹文件最大保留天数 |
| `AHE_TRUNCATE_CHARS` | `1000` | 工具输出最大字符数 |
| `AHE_SLOW_THRESHOLD_MS` | `5000` | 慢操作阈值（毫秒） |
| `AHE_REDACTION_ENABLED` | `true` | 启用敏感数据脱敏 |
| `AHE_LOG_LEVEL` | `INFO` | 日志级别 (DEBUG, INFO, WARN, ERROR, SILENT) |

### 配置示例

```bash
# ~/.bashrc 或 ~/.zshrc
export AHE_COLLECTION_ENABLED=true
export AHE_SLOW_THRESHOLD_MS=3000
export AHE_MAX_TRACE_FILES=200
```

---

## 📁 项目结构

```
claude-ahe-ts/
├── src/
│   ├── index.ts                  # CLI 入口
│   ├── types/
│   │   ├── index.ts              # 类型定义和 Zod 模式
│   │   ├── interfaces.ts         # 接口定义
│   │   └── errors.ts             # 自定义错误类型
│   ├── lib/
│   │   ├── config.ts             # 配置管理
│   │   ├── tracer.ts             # 轨迹收集和存储
│   │   ├── analyzer.ts           # 分析引擎
│   │   ├── logger.ts             # 可配置日志
│   │   ├── utils.ts              # 工具函数
│   │   └── redaction.ts          # 敏感数据脱敏
│   └── hooks/
│       ├── trace-collector.ts    # PostToolUse 钩子
│       └── session-summarizer.ts # Stop 钩子
├── tests/
│   ├── config.test.ts            # 配置测试
│   ├── utils.test.ts             # 工具函数测试
│   ├── tracer.test.ts            # 轨迹管理测试
│   ├── analyzer.test.ts          # 分析测试
│   ├── logger.test.ts            # 日志测试
│   └── integration/              # 集成测试
├── typedoc.json                  # TypeDoc 配置
├── package.json
├── tsconfig.json
└── install.sh
```

---

## 🔒 数据隐私与安全

### 自动数据脱敏

Claude AHE 自动从轨迹中脱敏敏感信息：

- 🔑 API 密钥（`sk-*`、`AKIA*`）
- 🔐 密码和密钥
- 📝 Bearer 令牌
- 🔒 私钥（RSA、EC、DSA）
- 🗄️ 连接字符串（MongoDB、PostgreSQL、MySQL、Redis）

### 安全特性

- **路径遍历保护** - 防止恶意目录访问
- **输入验证** - 使用 Zod 模式验证
- **可配置脱敏规则** - 自定义敏感数据模式
- **无外部数据传输** - 所有数据本地存储

---

## 📊 API 参考

### TraceData（轨迹数据）

```typescript
interface TraceData {
  timestamp: string;           // ISO 8601 时间戳
  session_id: string;          // 唯一会话标识
  tool: {
    name: string;              // 工具名称（Read、Write、Bash 等）
    input: Record<string, unknown>;
    output: string;            // 截断的工具输出
    execution_time_ms: number; // 执行时长
  };
  context: {
    working_directory: string;
    success: boolean;          // 错误检测结果
  };
}
```

### SessionSummary（会话摘要）

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

完整 API 文档见 [docs/api](./docs/api/)（使用 `npm run docs` 生成）。

---

## 🧪 开发

### 常用脚本

```bash
npm run build        # 编译 TypeScript
npm run dev          # 开发模式（监听变化）
npm run test         # 运行所有测试
npm run test:watch   # 测试监听模式
npm run coverage     # 运行测试并生成覆盖率报告
npm run lint         # 运行 ESLint
npm run lint:fix     # 自动修复 lint 问题
npm run typecheck    # TypeScript 类型检查
npm run docs         # 生成 TypeDoc 文档
npm run format       # 使用 Prettier 格式化代码
```

### 测试覆盖率

| 文件 | 语句 | 分支 | 函数 | 行 |
|------|------|------|------|-----|
| **总体** | 84% | 82% | 84% | 85% |
| logger.ts | 100% | 96% | 100% | 100% |
| config.ts | 97% | 97% | 100% | 96% |
| analyzer.ts | 92% | 83% | 86% | 94% |

---

## 🐛 故障排除

### 收集不工作

1. 检查钩子是否安装在 `~/.claude/settings.json`
2. 确认 `AHE_COLLECTION_ENABLED` 没有设置为 `false`
3. 运行 `npx claude-ahe status` 检查配置

### 没有轨迹被收集

1. 确认轨迹目录存在：`ls ~/.claude-ahe/traces`
2. 检查目录权限
3. 启用调试日志：`AHE_DEBUG=true AHE_LOG_LEVEL=DEBUG`

### 输入无效错误

1. 确保钩子输入是有效的 JSON
2. 检查 Claude Code 版本兼容性
3. 在调试模式下查看错误信息

---

## 🤝 参与贡献

欢迎参与贡献！请遵循以下步骤：

1. Fork 本仓库
2. 创建功能分支：`git checkout -b feature/amazing-feature`
3. 编写代码并添加测试
4. 运行测试和 lint：`npm test && npm run lint`
5. 提交更改：`git commit -m 'feat: add amazing feature'`
6. 推送到分支：`git push origin feature/amazing-feature`
7. 提交 Pull Request

### 代码风格

- TypeScript 严格模式
- ESLint + Prettier 格式化
- 测试覆盖率要求 80%+
- 公共 API 需要 JSDoc 注释

---

## 📝 许可证

MIT 许可证 - 详见 [LICENSE](LICENSE)。

---

## 🙏 致谢

- [Claude Code](https://claude.ai) - 本插件增强的 AI 编程助手
- [Zod](https://zod.dev) - 运行时类型验证
- [Jest](https://jestjs.io) - 测试框架

---

## 📮 支持

- **问题反馈**: [GitHub Issues](https://github.com/tinylion1024/claude-ahe-plugin/issues)
- **讨论交流**: [GitHub Discussions](https://github.com/tinylion1024/claude-ahe-plugin/discussions)

---

<p align="center">
  <strong>用 ❤️ 为 Claude Code 社区打造</strong>
</p>
