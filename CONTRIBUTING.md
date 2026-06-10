# Contributing to Claude Code AHE Plugin

Thank you for your interest in contributing to the Claude Code AHE (Agentic Harness Engineering) Plugin! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Development Environment Setup](#development-environment-setup)
- [Code Style Guidelines](#code-style-guidelines)
- [Commit Message Convention](#commit-message-convention)
- [Pull Request Process](#pull-request-process)
- [Testing Requirements](#testing-requirements)
- [Project Structure](#project-structure)

## Development Environment Setup

### Prerequisites

- **Node.js**: Version 18.0.0 or higher
- **pnpm**: Package manager (recommended)

### Installing pnpm

If you don't have pnpm installed, you can install it using npm:

```bash
npm install -g pnpm
```

Or using the official installation script:

```bash
# On macOS/Linux
curl -fsSL https://get.pnpm.io/install.sh | sh -

# On Windows (PowerShell)
iwr https://get.pnpm.io/install.ps1 -useb | iex
```

### Project Setup

1. **Fork and Clone the Repository**

   ```bash
   # Clone your fork
   git clone https://github.com/YOUR_USERNAME/claude-ahe-ts.git
   cd claude-ahe-ts
   ```

2. **Install Dependencies**

   ```bash
   pnpm install
   ```

3. **Build the Project**

   ```bash
   pnpm build
   ```

4. **Verify Installation**

   ```bash
   # Run tests to ensure everything works
   pnpm test

   # Check type correctness
   pnpm typecheck
   ```

### Development Workflow

```bash
# Run in development mode with auto-rebuild
pnpm dev

# Format code
pnpm format

# Check code formatting
pnpm format:check

# Run linter
pnpm lint

# Type check
pnpm typecheck

# Clean build artifacts
pnpm clean
```

## Code Style Guidelines

### TypeScript Coding Standards

This project follows strict TypeScript best practices:

#### Types and Interfaces

- **Use explicit types for public APIs**: All exported functions, shared utilities, and public class methods should have explicit parameter and return types
- **Prefer `interface` for object shapes** that may be extended or implemented
- **Use `type` for unions, intersections, tuples, and utility types**
- **Avoid `any`**: Use `unknown` for external/untrusted input, then narrow it safely

```typescript
// ✅ Good: Explicit types on public APIs
interface TraceData {
  timestamp: string;
  session_id: string;
  tool: ToolInfo;
}

export function parseTrace(data: unknown): TraceData {
  // Validate and narrow unknown type safely
  return traceSchema.parse(data);
}

// ❌ Bad: Using any
export function parseTrace(data: any): TraceData {
  return data; // Unsafe!
}
```

#### Immutability

- **Always create new objects**, never mutate existing ones
- **Use spread operator for immutable updates**

```typescript
// ✅ Good: Immutable update
function updateConfig(config: Config, updates: Partial<Config>): Config {
  return { ...config, ...updates };
}

// ❌ Bad: Mutation
function updateConfig(config: Config, updates: Partial<Config>): Config {
  Object.assign(config, updates); // Mutation!
  return config;
}
```

#### Error Handling

- **Handle errors explicitly at every level**
- **Narrow unknown errors safely using type guards**

```typescript
async function loadTraces(sessionId: string): Promise<TraceData[]> {
  try {
    const traces = await tracer.loadSessionTraces(sessionId);
    return traces;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Failed to load traces: ${message}`);
    throw new Error(`Failed to load traces for session ${sessionId}`);
  }
}
```

#### Input Validation

- **Validate all external input** using Zod schemas
- **Fail fast with clear error messages**

```typescript
import { z } from 'zod';

const configSchema = z.object({
  collectionEnabled: z.boolean().default(true),
  maxTraceFiles: z.number().int().positive().default(100),
  tracesDir: z.string().min(1)
});

type Config = z.infer<typeof configSchema>;
```

### Code Formatting with Prettier

This project uses Prettier for consistent code formatting. Configuration is in `.prettierrc`:

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "tabWidth": 2,
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "avoid"
}
```

**Format your code before committing:**

```bash
# Format all files
pnpm format

# Check formatting without making changes
pnpm format:check
```

### ESLint Rules

This project enforces the following ESLint rules:

- **`no-console`**: Warn (use proper logging libraries)
- **`no-magic-numbers`**: Warn (use named constants)
- **`@typescript-eslint/no-unused-vars`**: Error (with underscore prefix exception)
- **`@typescript-eslint/explicit-function-return-type`**: Warn for public APIs
- **`@typescript-eslint/no-explicit-any`**: Warn (avoid any)
- **`@typescript-eslint/prefer-readonly`**: Warn (prefer immutability)

Run the linter:

```bash
pnpm lint
```

### File Organization

- **Keep files focused**: 200-400 lines typical, 800 lines maximum
- **Organize by feature/domain**, not by file type
- **Extract utilities from large modules**

## Commit Message Convention

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>: <description>

[optional body]

[optional footer]
```

### Commit Types

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New feature | `feat: add trace filtering by tool name` |
| `fix` | Bug fix | `fix: handle empty session IDs gracefully` |
| `docs` | Documentation only | `docs: update installation instructions` |
| `style` | Code style (formatting, semicolons) | `style: apply prettier formatting` |
| `refactor` | Code refactoring | `refactor: extract trace parsing logic` |
| `test` | Adding/updating tests | `test: add tests for analyzer edge cases` |
| `chore` | Maintenance tasks | `chore: update dependencies` |
| `perf` | Performance improvement | `perf: optimize trace file reading` |

### Examples

```bash
# Feature
git commit -m "feat: add support for custom trace directories"

# Bug fix with issue reference
git commit -m "fix: prevent duplicate trace entries

Fixes #123"

# Breaking change
git commit -m "feat!: change TraceData schema

BREAKING CHANGE: The 'tool' field now uses a nested object structure"
```

### Commit Best Practices

- **Write clear, descriptive commit messages**
- **Keep commits atomic** (one logical change per commit)
- **Reference issues and PRs** when applicable
- **Use imperative mood** ("add feature" not "added feature")

## Pull Request Process

### Before Submitting a PR

1. **Create a Feature Branch**

   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **Make Your Changes**
   - Follow the code style guidelines
   - Write/update tests for your changes
   - Update documentation if needed

3. **Run Quality Checks**

   ```bash
   # Format code
   pnpm format

   # Run linter
   pnpm lint

   # Type check
   pnpm typecheck

   # Run tests with coverage
   pnpm coverage
   ```

4. **Commit Your Changes**

   ```bash
   git add .
   git commit -m "feat: your feature description"
   ```

5. **Push to Your Fork**

   ```bash
   git push origin feat/your-feature-name
   ```

### PR Checklist

Before submitting your pull request, ensure:

- [ ] Code follows the project's TypeScript coding standards
- [ ] All code is formatted with Prettier
- [ ] ESLint passes with no errors
- [ ] TypeScript compiles without errors
- [ ] All tests pass (`pnpm test`)
- [ ] Test coverage meets 70% minimum
- [ ] Documentation is updated (if applicable)
- [ ] Commit messages follow Conventional Commits
- [ ] PR description clearly explains the changes

### PR Review Process

1. **Automated Checks**: CI pipeline runs tests, linter, and type checks
2. **Code Review**: Maintainers review your code for quality and correctness
3. **Feedback**: Address any requested changes
4. **Approval**: Once approved, your PR will be merged

### PR Description Template

```markdown
## Description
[Describe your changes]

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests added/updated
- [ ] All tests pass
- [ ] Coverage >= 70%

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings introduced
```

## Testing Requirements

### Test Coverage

This project requires **minimum 70% test coverage** for all new code.

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests with coverage report
pnpm coverage

# Run specific test file
pnpm test tests/config.test.ts

# Run tests in watch mode
pnpm test -- --watch
```

### Test Structure

Tests follow the **AAA Pattern** (Arrange-Act-Assert):

```typescript
describe('TraceAnalyzer', () => {
  test('calculates error rate correctly', () => {
    // Arrange
    const traces: TraceData[] = [
      createMockTrace({ success: false }),
      createMockTrace({ success: true }),
    ];

    // Act
    const stats = analyzer.calculateStatistics(traces);

    // Assert
    expect(stats.errorRatePercent).toBe(50);
  });
});
```

### Test Naming

Use descriptive names that explain the behavior:

```typescript
// ✅ Good: Describes the behavior
test('returns empty array when no traces match session ID', () => {});

// ❌ Bad: Vague
test('handles empty case', () => {});
```

### What to Test

- **Unit Tests**: Individual functions, utilities, and classes
- **Integration Tests**: Hook integrations, file I/O operations
- **Edge Cases**: Empty inputs, null values, boundary conditions
- **Error Handling**: Error conditions and error messages

### Test Files

The project includes comprehensive test suites:

- `tests/config.test.ts` - Configuration loading and validation
- `tests/utils.test.ts` - Utility functions
- `tests/tracer.test.ts` - Trace collection and management
- `tests/analyzer.test.ts` - Analysis engine

## Project Structure

```
claude-ahe-ts/
├── src/
│   ├── index.ts              # CLI entry point
│   ├── types/
│   │   ├── index.ts          # Type exports
│   │   └── interfaces.ts     # Type definitions + Zod schemas
│   ├── lib/
│   │   ├── index.ts          # Library exports
│   │   ├── config.ts         # Configuration management
│   │   ├── tracer.ts         # Trace management
│   │   ├── analyzer.ts       # Analysis engine
│   │   ├── utils.ts          # Utility functions
│   │   └── logger.ts         # Logging utilities
│   └── hooks/
│       ├── index.ts          # Hook exports
│       ├── trace-collector.ts    # PostToolUse hook
│       └── session-summarizer.ts # Stop hook
├── skills/
│   ├── ahe-analyze/
│   │   └── SKILL.md          # Analyze skill definition
│   └── ahe-status/
│       └── SKILL.md          # Status skill definition
├── tests/
│   ├── config.test.ts        # Config tests
│   ├── utils.test.ts         # Utility tests
│   ├── tracer.test.ts        # Tracer tests
│   └── analyzer.test.ts      # Analyzer tests
├── dist/                     # Compiled output (git-ignored)
├── node_modules/             # Dependencies (git-ignored)
├── .prettierrc               # Prettier configuration
├── .prettierignore           # Prettier ignore rules
├── eslint.config.js          # ESLint configuration
├── tsconfig.json             # TypeScript configuration
├── package.json              # Project metadata and scripts
├── install.sh                # Installation script
├── README.md                 # Project documentation
└── CONTRIBUTING.md           # This file
```

### Key Directories

- **`src/`**: Source code organized by functionality
  - `types/`: TypeScript interfaces, types, and Zod schemas
  - `lib/`: Core library modules (config, tracer, analyzer, utils)
  - `hooks/`: Claude Code hook implementations
- **`skills/`**: Claude Code skill definitions
- **`tests/`**: Test files mirroring the source structure
- **`dist/`**: Compiled JavaScript output

### Key Files

- **`src/index.ts`**: CLI entry point with command handlers
- **`src/types/interfaces.ts`**: Core type definitions and validation schemas
- **`src/lib/config.ts`**: Environment variable configuration
- **`src/lib/tracer.ts`**: Trace file I/O and session management
- **`src/lib/analyzer.ts`**: Pattern analysis and recommendation engine

## Getting Help

- **Issues**: [GitHub Issues](https://github.com/YOUR_REPO/claude-ahe-ts/issues)
- **Discussions**: [GitHub Discussions](https://github.com/YOUR_REPO/claude-ahe-ts/discussions)

## License

By contributing to this project, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing! 🎉
