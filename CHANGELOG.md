# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-06-11

### Added
- Test coverage reporting with Jest/nyc
- ESLint configuration with TypeScript rules
- Prettier code formatting
- Husky and lint-staged for pre-commit hooks
- Configurable logger system (ILogger, ConsoleLogger, SilentLogger)
- Interface abstractions (ITraceManager, IAnalyzer, ILogger)
- Environment variable: AHE_LOG_LEVEL for logging control
- Environment variables: AHE_MAX_ERRORS_PER_SESSION, AHE_MAX_SLOW_OPS_PER_SESSION, AHE_ERROR_PREVIEW_LENGTH
- GitHub Actions CI/CD workflow
- Integration tests for hooks

### Changed
- Refactored all synchronous I/O to async/await patterns
- Extracted magic numbers to configuration
- Upgraded ESLint to v9, TypeScript-ESLint to v8

### Fixed
- Improved error handling in trace collection

## [0.1.0] - 2025-01-XX

### Added
- Initial release
- Trace collection via PostToolUse hook
- Session summarization via Stop hook
- Pattern analysis for high error rates and slow operations
- CLI commands: analyze, status, report, clean, config
- Skills: ahe-analyze, ahe-status
- Comprehensive configuration via environment variables
- Zod-based input validation
- Path traversal protection
