import { formatRegExp } from './regexUtils';
import { RedactablePrimitive } from './types';

/**
 * Opt-in regex matching against scalar **values** (not key names).
 * Applied only when key-based rules do not already redact the field.
 */
export class ValuePatternMatcher {
  private readonly patterns: RegExp[];

  constructor(patterns?: RegExp[]) {
    this.patterns = patterns ?? [];
  }

  public hasPatterns(): boolean {
    return this.patterns.length > 0;
  }

  public findMatching(value: RedactablePrimitive | undefined): RegExp | undefined {
    if (value === undefined || value === null || typeof value === 'boolean') {
      return undefined;
    }

    const text = String(value);
    return this.patterns.find((pattern) => pattern.test(text));
  }

  public formatPattern(regex: RegExp): string {
    return formatRegExp(regex);
  }
}

/** Shared empty matcher for tests and configs without value patterns. */
export const EMPTY_VALUE_PATTERN_MATCHER = new ValuePatternMatcher();
