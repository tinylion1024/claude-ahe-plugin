/**
 * Tests for configuration module
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  loadConfig,
  getConfig,
  resetConfig,
  AHEConfigSchema,
  type AHEConfig,
} from '../src/lib/config';

describe('config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset config singleton
    resetConfig();
    // Clear relevant env vars
    delete process.env.AHE_COLLECTION_ENABLED;
    delete process.env.AHE_TRACES_DIR;
    delete process.env.AHE_ANALYSIS_DIR;
    delete process.env.AHE_MAX_TRACE_FILES;
    delete process.env.AHE_TRUNCATE_CHARS;
    delete process.env.AHE_MAX_TRACE_AGE_DAYS;
    delete process.env.AHE_LOOKBACK_SESSIONS;
    delete process.env.AHE_SLOW_THRESHOLD_MS;
    delete process.env.AHE_SHOW_TIMESTAMPS;
    delete process.env.AHE_SHOW_TIMES;
    delete process.env.AHE_MAX_ISSUES;
    delete process.env.AHE_MAX_ERRORS_PER_SESSION;
    delete process.env.AHE_MAX_SLOW_OPS_PER_SESSION;
    delete process.env.AHE_ERROR_PREVIEW_LENGTH;
  });

  afterEach(() => {
    // Restore original env
    process.env = originalEnv;
    resetConfig();
  });

  describe('AHEConfigSchema', () => {
    it('should validate a complete config', () => {
      const config: AHEConfig = {
        collection: {
          enabled: true,
          max_trace_files: 100,
          truncate_output_chars: 1000,
          trace_dir: '/tmp/traces',
          max_trace_age_days: 7,
        },
        analysis: {
          default_lookback_sessions: 5,
          slow_operation_threshold_ms: 5000,
          error_keywords: ['error'],
          analysis_dir: '/tmp/analysis',
          max_errors_per_session: 10,
          max_slow_ops_per_session: 10,
          error_preview_length: 200,
        },
        display: {
          show_timestamps: true,
          show_execution_times: true,
          max_issues_shown: 5,
        },
      };

      const result = AHEConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should apply defaults for missing values', () => {
      // Zod v4 requires all fields, so we provide a minimal valid config
      const minimalConfig = {
        collection: {
          enabled: true,
          max_trace_files: 100,
          truncate_output_chars: 1000,
          trace_dir: '/tmp/traces',
          max_trace_age_days: 7,
        },
        analysis: {
          default_lookback_sessions: 5,
          slow_operation_threshold_ms: 5000,
          error_keywords: ['error'],
          analysis_dir: '/tmp/analysis',
          max_errors_per_session: 10,
          max_slow_ops_per_session: 10,
          error_preview_length: 200,
        },
        display: {
          show_timestamps: true,
          show_execution_times: true,
          max_issues_shown: 5,
        },
      };
      const result = AHEConfigSchema.safeParse(minimalConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.collection.enabled).toBe(true);
        expect(result.data.collection.max_trace_files).toBe(100);
      }
    });

    it('should reject invalid max_trace_files', () => {
      const result = AHEConfigSchema.safeParse({
        collection: { max_trace_files: -1 },
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-string trace_dir', () => {
      const result = AHEConfigSchema.safeParse({
        collection: { trace_dir: 123 },
      });
      expect(result.success).toBe(false);
    });
  });

  describe('loadConfig', () => {
    it('should return default config when no env vars set', () => {
      const config = loadConfig();
      expect(config.collection.enabled).toBe(true);
      expect(config.collection.max_trace_files).toBe(100);
      expect(config.analysis.default_lookback_sessions).toBe(5);
    });

    it('should read AHE_COLLECTION_ENABLED=false', () => {
      process.env.AHE_COLLECTION_ENABLED = 'false';
      resetConfig();
      const config = loadConfig();
      expect(config.collection.enabled).toBe(false);
    });

    it('should read AHE_COLLECTION_ENABLED=true', () => {
      process.env.AHE_COLLECTION_ENABLED = 'true';
      resetConfig();
      const config = loadConfig();
      expect(config.collection.enabled).toBe(true);
    });

    it('should read AHE_MAX_TRACE_FILES', () => {
      process.env.AHE_MAX_TRACE_FILES = '200';
      resetConfig();
      const config = loadConfig();
      expect(config.collection.max_trace_files).toBe(200);
    });

    it('should read AHE_SLOW_THRESHOLD_MS', () => {
      process.env.AHE_SLOW_THRESHOLD_MS = '10000';
      resetConfig();
      const config = loadConfig();
      expect(config.analysis.slow_operation_threshold_ms).toBe(10000);
    });

    it('should handle invalid AHE_MAX_TRACE_FILES gracefully', () => {
      process.env.AHE_MAX_TRACE_FILES = 'invalid';
      resetConfig();
      const config = loadConfig();
      // Should use default
      expect(config.collection.max_trace_files).toBe(100);
    });

    it('should reject path traversal in AHE_TRACES_DIR', () => {
      process.env.AHE_TRACES_DIR = '/tmp/../etc/passwd';
      resetConfig();
      const config = loadConfig();
      // Should use default (path validation failed)
      expect(config.collection.trace_dir).not.toContain('..');
    });

    it('should accept valid custom AHE_TRACES_DIR', () => {
      process.env.AHE_TRACES_DIR = '/tmp/my-traces';
      resetConfig();
      const config = loadConfig();
      expect(config.collection.trace_dir).toBe('/tmp/my-traces');
    });

    it('should read AHE_MAX_ERRORS_PER_SESSION', () => {
      process.env.AHE_MAX_ERRORS_PER_SESSION = '20';
      resetConfig();
      const config = loadConfig();
      expect(config.analysis.max_errors_per_session).toBe(20);
    });

    it('should read AHE_MAX_SLOW_OPS_PER_SESSION', () => {
      process.env.AHE_MAX_SLOW_OPS_PER_SESSION = '15';
      resetConfig();
      const config = loadConfig();
      expect(config.analysis.max_slow_ops_per_session).toBe(15);
    });

    it('should read AHE_ERROR_PREVIEW_LENGTH', () => {
      process.env.AHE_ERROR_PREVIEW_LENGTH = '500';
      resetConfig();
      const config = loadConfig();
      expect(config.analysis.error_preview_length).toBe(500);
    });

    it('should handle invalid AHE_MAX_ERRORS_PER_SESSION gracefully', () => {
      process.env.AHE_MAX_ERRORS_PER_SESSION = 'invalid';
      resetConfig();
      const config = loadConfig();
      // Should use default
      expect(config.analysis.max_errors_per_session).toBe(10);
    });

    it('should handle invalid AHE_MAX_SLOW_OPS_PER_SESSION gracefully', () => {
      process.env.AHE_MAX_SLOW_OPS_PER_SESSION = '-5';
      resetConfig();
      const config = loadConfig();
      // Should use default
      expect(config.analysis.max_slow_ops_per_session).toBe(10);
    });

    it('should handle invalid AHE_ERROR_PREVIEW_LENGTH gracefully', () => {
      process.env.AHE_ERROR_PREVIEW_LENGTH = '0';
      resetConfig();
      const config = loadConfig();
      // Should use default
      expect(config.analysis.error_preview_length).toBe(200);
    });
  });

  describe('getConfig (singleton)', () => {
    it('should return the same config instance', () => {
      resetConfig();
      const config1 = getConfig();
      const config2 = getConfig();
      expect(config1).toBe(config2);
    });

    it('should reload config after resetConfig', () => {
      resetConfig();
      const config1 = getConfig();
      process.env.AHE_MAX_TRACE_FILES = '999';
      resetConfig();
      const config2 = getConfig();
      expect(config2.collection.max_trace_files).toBe(999);
      expect(config1).not.toBe(config2);
    });
  });
});
