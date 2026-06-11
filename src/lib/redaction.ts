/**
 * Data redaction utilities for sensitive information
 *
 * @module lib/redaction
 */

import { getConfig } from './config.js';
import { getLogger } from './logger.js';

/**
 * Redact sensitive data from a string based on configured patterns
 *
 * @param text - Text to redact
 * @returns Redacted text with sensitive data replaced
 */
export function redactSensitiveData(text: string): string {
  const config = getConfig();

  if (!config.redaction.enabled) {
    return text;
  }

  let redactedText = text;

  for (const pattern of config.redaction.patterns) {
    try {
      const regex = new RegExp(pattern, 'gi');
      redactedText = redactedText.replace(regex, config.redaction.replacement);
    } catch {
      // Skip invalid regex patterns
      getLogger().warn(`Invalid redaction pattern: ${pattern}`);
    }
  }

  return redactedText;
}

/**
 * Redact sensitive data from an object (deep scan)
 *
 * @param obj - Object to redact
 * @returns Redacted object with sensitive data replaced
 */
export function redactObject(obj: unknown): unknown {
  if (typeof obj === 'string') {
    return redactSensitiveData(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(redactObject);
  }

  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      // Redact values for sensitive keys
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes('password') ||
        lowerKey.includes('secret') ||
        lowerKey.includes('token') ||
        lowerKey.includes('key') ||
        lowerKey.includes('credential')
      ) {
        result[key] = '[REDACTED]';
      } else {
        result[key] = redactObject(value);
      }
    }
    return result;
  }

  return obj;
}
