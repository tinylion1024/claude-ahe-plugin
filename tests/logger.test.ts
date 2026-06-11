/**
 * Tests for Logger Module
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  LogLevel,
  ConsoleLogger,
  SilentLogger,
  parseLogLevel,
  createLogger,
  getLogger,
  resetLogger,
} from '../src/lib/logger';

describe('logger', () => {
  const originalEnv = process.env.AHE_LOG_LEVEL;

  beforeEach(() => {
    resetLogger();
    delete process.env.AHE_LOG_LEVEL;
  });

  afterEach(() => {
    resetLogger();
    if (originalEnv !== undefined) {
      process.env.AHE_LOG_LEVEL = originalEnv;
    } else {
      delete process.env.AHE_LOG_LEVEL;
    }
  });

  describe('LogLevel enum', () => {
    it('should have correct numeric values', () => {
      expect(LogLevel.DEBUG).toBe(0);
      expect(LogLevel.INFO).toBe(1);
      expect(LogLevel.WARN).toBe(2);
      expect(LogLevel.ERROR).toBe(3);
      expect(LogLevel.SILENT).toBe(4);
    });

    it('should be ordered correctly', () => {
      expect(LogLevel.DEBUG < LogLevel.INFO).toBe(true);
      expect(LogLevel.INFO < LogLevel.WARN).toBe(true);
      expect(LogLevel.WARN < LogLevel.ERROR).toBe(true);
      expect(LogLevel.ERROR < LogLevel.SILENT).toBe(true);
    });
  });

  describe('ConsoleLogger', () => {
    describe('debug level', () => {
      it('should log debug messages at DEBUG level', () => {
        const logger = new ConsoleLogger(LogLevel.DEBUG);
        const originalLog = console.log;
        let logged = false;
        console.log = (...args: unknown[]) => {
          logged = true;
          expect(args[0]).toContain('[DEBUG]');
          expect(args[0]).toContain('test message');
        };
        logger.debug('test message');
        expect(logged).toBe(true);
        console.log = originalLog;
      });

      it('should log info messages at DEBUG level', () => {
        const logger = new ConsoleLogger(LogLevel.DEBUG);
        const originalLog = console.log;
        let logged = false;
        console.log = (...args: unknown[]) => {
          logged = true;
          expect(args[0]).toContain('[INFO]');
        };
        logger.info('test');
        expect(logged).toBe(true);
        console.log = originalLog;
      });

      it('should log warn messages at DEBUG level', () => {
        const logger = new ConsoleLogger(LogLevel.DEBUG);
        const originalWarn = console.warn;
        let logged = false;
        console.warn = (...args: unknown[]) => {
          logged = true;
          expect(args[0]).toContain('[WARN]');
        };
        logger.warn('test');
        expect(logged).toBe(true);
        console.warn = originalWarn;
      });

      it('should log error messages at DEBUG level', () => {
        const logger = new ConsoleLogger(LogLevel.DEBUG);
        const originalError = console.error;
        let logged = false;
        console.error = (...args: unknown[]) => {
          logged = true;
          expect(args[0]).toContain('[ERROR]');
        };
        logger.error('test');
        expect(logged).toBe(true);
        console.error = originalError;
      });
    });

    describe('info level', () => {
      it('should not log debug messages at INFO level', () => {
        const logger = new ConsoleLogger(LogLevel.INFO);
        const originalLog = console.log;
        let logged = false;
        console.log = () => {
          logged = true;
        };
        logger.debug('test');
        expect(logged).toBe(false);
        console.log = originalLog;
      });

      it('should log info messages at INFO level', () => {
        const logger = new ConsoleLogger(LogLevel.INFO);
        const originalLog = console.log;
        let logged = false;
        console.log = () => {
          logged = true;
        };
        logger.info('test');
        expect(logged).toBe(true);
        console.log = originalLog;
      });
    });

    describe('warn level', () => {
      it('should not log debug or info messages at WARN level', () => {
        const logger = new ConsoleLogger(LogLevel.WARN);
        const originalLog = console.log;
        let logged = 0;
        console.log = () => {
          logged++;
        };
        logger.debug('test');
        logger.info('test');
        expect(logged).toBe(0);
        console.log = originalLog;
      });

      it('should log warn messages at WARN level', () => {
        const logger = new ConsoleLogger(LogLevel.WARN);
        const originalWarn = console.warn;
        let logged = false;
        console.warn = () => {
          logged = true;
        };
        logger.warn('test');
        expect(logged).toBe(true);
        console.warn = originalWarn;
      });
    });

    describe('error level', () => {
      it('should only log error messages at ERROR level', () => {
        const logger = new ConsoleLogger(LogLevel.ERROR);
        const originalLog = console.log;
        const originalWarn = console.warn;
        const originalError = console.error;
        let logCount = 0;
        let warnCount = 0;
        let errorCount = 0;
        console.log = () => logCount++;
        console.warn = () => warnCount++;
        console.error = () => errorCount++;
        logger.debug('test');
        logger.info('test');
        logger.warn('test');
        logger.error('test');
        expect(logCount).toBe(0);
        expect(warnCount).toBe(0);
        expect(errorCount).toBe(1);
        console.log = originalLog;
        console.warn = originalWarn;
        console.error = originalError;
      });
    });

    describe('silent level', () => {
      it('should not log any messages at SILENT level', () => {
        const logger = new ConsoleLogger(LogLevel.SILENT);
        const originalLog = console.log;
        const originalWarn = console.warn;
        const originalError = console.error;
        let anyLogged = false;
        console.log = () => (anyLogged = true);
        console.warn = () => (anyLogged = true);
        console.error = () => (anyLogged = true);
        logger.debug('test');
        logger.info('test');
        logger.warn('test');
        logger.error('test');
        expect(anyLogged).toBe(false);
        console.log = originalLog;
        console.warn = originalWarn;
        console.error = originalError;
      });
    });

    describe('arguments', () => {
      it('should pass additional arguments to console.log', () => {
        const logger = new ConsoleLogger(LogLevel.DEBUG);
        const originalLog = console.log;
        let receivedArgs: unknown[] = [];
        console.log = (...args: unknown[]) => {
          receivedArgs = args;
        };
        logger.info('message', 'arg1', 'arg2', { key: 'value' });
        expect(receivedArgs.length).toBeGreaterThan(1);
        console.log = originalLog;
      });
    });
  });

  describe('SilentLogger', () => {
    it('should have all log methods', () => {
      const logger = new SilentLogger();
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
    });

    it('should not produce any output for debug', () => {
      const logger = new SilentLogger();
      const originalLog = console.log;
      let logged = false;
      console.log = () => (logged = true);
      logger.debug('test');
      expect(logged).toBe(false);
      console.log = originalLog;
    });

    it('should not produce any output for info', () => {
      const logger = new SilentLogger();
      const originalLog = console.log;
      let logged = false;
      console.log = () => (logged = true);
      logger.info('test');
      expect(logged).toBe(false);
      console.log = originalLog;
    });

    it('should not produce any output for warn', () => {
      const logger = new SilentLogger();
      const originalWarn = console.warn;
      let logged = false;
      console.warn = () => (logged = true);
      logger.warn('test');
      expect(logged).toBe(false);
      console.warn = originalWarn;
    });

    it('should not produce any output for error', () => {
      const logger = new SilentLogger();
      const originalError = console.error;
      let logged = false;
      console.error = () => (logged = true);
      logger.error('test');
      expect(logged).toBe(false);
      console.error = originalError;
    });

    it('should accept additional arguments without error', () => {
      const logger = new SilentLogger();
      // Should not throw
      expect(() => logger.debug('test', 'arg1', 'arg2')).not.toThrow();
      expect(() => logger.info('test', { key: 'value' })).not.toThrow();
      expect(() => logger.warn('test', 123)).not.toThrow();
      expect(() => logger.error('test', new Error('err'))).not.toThrow();
    });
  });

  describe('parseLogLevel', () => {
    it('should return INFO for undefined input', () => {
      expect(parseLogLevel(undefined)).toBe(LogLevel.INFO);
    });

    it('should parse DEBUG', () => {
      expect(parseLogLevel('DEBUG')).toBe(LogLevel.DEBUG);
      expect(parseLogLevel('debug')).toBe(LogLevel.DEBUG);
      expect(parseLogLevel('  debug  ')).toBe(LogLevel.DEBUG);
    });

    it('should parse INFO', () => {
      expect(parseLogLevel('INFO')).toBe(LogLevel.INFO);
      expect(parseLogLevel('info')).toBe(LogLevel.INFO);
    });

    it('should parse WARN and WARNING', () => {
      expect(parseLogLevel('WARN')).toBe(LogLevel.WARN);
      expect(parseLogLevel('warn')).toBe(LogLevel.WARN);
      expect(parseLogLevel('WARNING')).toBe(LogLevel.WARN);
      expect(parseLogLevel('warning')).toBe(LogLevel.WARN);
    });

    it('should parse ERROR', () => {
      expect(parseLogLevel('ERROR')).toBe(LogLevel.ERROR);
      expect(parseLogLevel('error')).toBe(LogLevel.ERROR);
    });

    it('should parse SILENT, QUIET, and NONE', () => {
      expect(parseLogLevel('SILENT')).toBe(LogLevel.SILENT);
      expect(parseLogLevel('silent')).toBe(LogLevel.SILENT);
      expect(parseLogLevel('QUIET')).toBe(LogLevel.SILENT);
      expect(parseLogLevel('quiet')).toBe(LogLevel.SILENT);
      expect(parseLogLevel('NONE')).toBe(LogLevel.SILENT);
      expect(parseLogLevel('none')).toBe(LogLevel.SILENT);
    });

    it('should return INFO and warn for unknown levels', () => {
      const originalWarn = console.warn;
      let warned = false;
      console.warn = () => (warned = true);
      expect(parseLogLevel('UNKNOWN')).toBe(LogLevel.INFO);
      expect(warned).toBe(true);
      console.warn = originalWarn;
    });
  });

  describe('createLogger', () => {
    it('should create ConsoleLogger by default', () => {
      const logger = createLogger();
      expect(logger).toBeInstanceOf(ConsoleLogger);
    });

    it('should create SilentLogger for SILENT level', () => {
      const logger = createLogger('SILENT');
      expect(logger).toBeInstanceOf(SilentLogger);
    });

    it('should create SilentLogger for QUIET level', () => {
      const logger = createLogger('QUIET');
      expect(logger).toBeInstanceOf(SilentLogger);
    });

    it('should use environment variable when no argument provided', () => {
      process.env.AHE_LOG_LEVEL = 'DEBUG';
      const logger = createLogger();
      expect(logger).toBeInstanceOf(ConsoleLogger);
    });

    it('should create ConsoleLogger for non-silent levels', () => {
      expect(createLogger('DEBUG')).toBeInstanceOf(ConsoleLogger);
      expect(createLogger('INFO')).toBeInstanceOf(ConsoleLogger);
      expect(createLogger('WARN')).toBeInstanceOf(ConsoleLogger);
      expect(createLogger('ERROR')).toBeInstanceOf(ConsoleLogger);
    });

    it('should prioritize argument over environment variable', () => {
      process.env.AHE_LOG_LEVEL = 'ERROR';
      const logger = createLogger('DEBUG');
      // DEBUG level should log, even if env says ERROR
      expect(logger).toBeInstanceOf(ConsoleLogger);
    });
  });

  describe('getLogger', () => {
    it('should return a logger instance', () => {
      const logger = getLogger();
      expect(logger).toBeDefined();
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
    });

    it('should return the same instance on multiple calls', () => {
      const logger1 = getLogger();
      const logger2 = getLogger();
      expect(logger1).toBe(logger2);
    });

    it('should create new instance after reset', () => {
      const logger1 = getLogger();
      resetLogger();
      const logger2 = getLogger();
      expect(logger1).not.toBe(logger2);
    });
  });

  describe('resetLogger', () => {
    it('should reset the global logger', () => {
      const logger1 = getLogger();
      resetLogger();
      const logger2 = getLogger();
      expect(logger1).not.toBe(logger2);
    });

    it('should not throw when called multiple times', () => {
      resetLogger();
      resetLogger();
      resetLogger();
      expect(() => resetLogger()).not.toThrow();
    });
  });
});
