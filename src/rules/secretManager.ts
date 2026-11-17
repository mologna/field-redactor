import { formatRegExp } from '../util/regexUtils';
import { SecretManagerConfig, SecretSpecifierValue } from '../types';
import { flattenSecretKeyPatterns, KeyPatternEntry } from './redactorBinding';

export type KeyRule = 'remove' | 'opaque' | 'deep' | 'shallow';

const KEY_RULE_PRECEDENCE: KeyRule[] = ['remove', 'opaque', 'deep', 'shallow'];

/**
 * Key-regex matcher. When `secretKeys` is omitted (`undefined`) and no opaque/deep/remove lists
 * force it to `[]`, every key is treated as a shallow secret. {@link FieldRedactor} still requires
 * at least one explicit rule list; a schemas-only config can leave `secretKeys` undefined so
 * unmatched keys are still shallow-redacted.
 *
 * Rule objects are flattened to one entry per regex. The first matching entry in a list wins,
 * and its transform (if any) is the one {@link RuleResolver} will prefer for that mode.
 */
export class SecretManager {
  private secretKeys?: KeyPatternEntry[];
  private deepSecretKeys?: KeyPatternEntry[];
  private opaqueSecretKeys?: KeyPatternEntry[];
  private removeSecretKeys?: RegExp[];
  private passKeys?: RegExp[];

  constructor(config: SecretManagerConfig) {
    this.deepSecretKeys = flattenSecretKeyPatterns(config.deepSecretKeys);
    this.opaqueSecretKeys = flattenSecretKeyPatterns(config.opaqueSecretKeys);
    this.removeSecretKeys = config.removeSecretKeys;
    this.passKeys = config.passKeys;

    const hasScopedKeyRules = !!(config.deepSecretKeys || config.opaqueSecretKeys || config.removeSecretKeys);
    if (!config.secretKeys && hasScopedKeyRules) {
      this.secretKeys = [];
    } else {
      this.secretKeys = flattenSecretKeyPatterns(config.secretKeys);
    }
  }

  /**
   * True when the key matches `secretKeys`, or when `secretKeys` is `undefined` (all-keys shallow default).
   */
  public isSecretKey(key: SecretSpecifierValue): boolean {
    if (!this.secretKeys) {
      return true;
    }

    return this.matchesRule(key, 'shallow');
  }

  public isDeepSecretKey(key: SecretSpecifierValue): boolean {
    return this.matchesRule(key, 'deep');
  }

  public isOpaqueSecretKey(key: SecretSpecifierValue): boolean {
    return this.matchesRule(key, 'opaque');
  }

  public isRemoveSecretKey(key: SecretSpecifierValue): boolean {
    return this.matchesRule(key, 'remove');
  }

  /** Determines if a key is allowlisted and should not be redacted under deep parents. */
  public isPassKey(key: SecretSpecifierValue): boolean {
    return !!this.passKeys && SecretManager.matchesAnyRegex(key, this.passKeys);
  }

  public getKeyRulePattern(key: SecretSpecifierValue, rule: KeyRule): string | undefined {
    const entry = this.findKeyPattern(key, rule);
    return entry ? formatRegExp(entry.pattern) : undefined;
  }

  /** First matching pattern for a mode, including a transform copied from a rule object. */
  public findKeyPattern(key: SecretSpecifierValue, rule: KeyRule): KeyPatternEntry | undefined {
    if (rule === 'remove') {
      const pattern = SecretManager.findMatchingRegex(key, this.removeSecretKeys);
      return pattern ? { pattern } : undefined;
    }

    return SecretManager.findMatchingEntry(key, this.entriesFor(rule));
  }

  public classifyKeyRule(key: SecretSpecifierValue): KeyRule | 'default' | null {
    for (const rule of KEY_RULE_PRECEDENCE) {
      if (this.matchesRule(key, rule)) {
        return rule;
      }
    }

    if (this.isSecretKey(key)) {
      return this.secretKeys ? 'shallow' : 'default';
    }

    return null;
  }

  private matchesRule(key: SecretSpecifierValue, rule: KeyRule): boolean {
    return !!this.findKeyPattern(key, rule);
  }

  private entriesFor(rule: Exclude<KeyRule, 'remove'>): KeyPatternEntry[] | undefined {
    switch (rule) {
      case 'opaque':
        return this.opaqueSecretKeys;
      case 'deep':
        return this.deepSecretKeys;
      case 'shallow':
        return this.secretKeys;
    }
  }

  private static findMatchingEntry(
    key: SecretSpecifierValue,
    entries?: KeyPatternEntry[]
  ): KeyPatternEntry | undefined {
    return entries?.find((entry) => entry.pattern.test(String(key)));
  }

  private static findMatchingRegex(key: SecretSpecifierValue, regexes?: RegExp[]): RegExp | undefined {
    return regexes?.find((regex) => regex.test(String(key)));
  }

  private static matchesAnyRegex(value: SecretSpecifierValue, regexes: RegExp[]): boolean {
    return regexes.some((regex) => regex.test(String(value)));
  }
}
