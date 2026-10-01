import { formatRegExp } from '../util/regexUtils';
import { SecretManagerConfig, SecretSpecifierValue } from '../types';

export type KeyRule = 'remove' | 'opaque' | 'deep' | 'shallow';

const KEY_RULE_PRECEDENCE: KeyRule[] = ['remove', 'opaque', 'deep', 'shallow'];

/**
 * Key-regex matcher. When `secretKeys` is omitted (`undefined`) and no opaque/deep/remove lists
 * force it to `[]`, every key is treated as a shallow secret. {@link FieldRedactor} still requires
 * at least one explicit rule list; a schemas-only config can leave `secretKeys` undefined so
 * unmatched keys are still shallow-redacted.
 */
export class SecretManager {
  private secretKeys?: RegExp[];
  private deepSecretKeys?: RegExp[];
  private opaqueSecretKeys?: RegExp[];
  private removeSecretKeys?: RegExp[];
  private passKeys?: RegExp[];

  constructor(config: SecretManagerConfig) {
    this.deepSecretKeys = config.deepSecretKeys;
    this.opaqueSecretKeys = config.opaqueSecretKeys;
    this.removeSecretKeys = config.removeSecretKeys;
    this.passKeys = config.passKeys;

    const hasScopedKeyRules = !!(this.deepSecretKeys || this.opaqueSecretKeys || this.removeSecretKeys);
    if (!config.secretKeys && hasScopedKeyRules) {
      this.secretKeys = [];
    } else {
      this.secretKeys = config.secretKeys;
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
    const match = SecretManager.findMatchingRegex(key, this.regexListFor(rule));
    return match ? formatRegExp(match) : undefined;
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
    const regexes = this.regexListFor(rule);
    return !!regexes && SecretManager.matchesAnyRegex(key, regexes);
  }

  private regexListFor(rule: KeyRule): RegExp[] | undefined {
    switch (rule) {
      case 'remove':
        return this.removeSecretKeys;
      case 'opaque':
        return this.opaqueSecretKeys;
      case 'deep':
        return this.deepSecretKeys;
      case 'shallow':
        return this.secretKeys;
    }
  }

  private static findMatchingRegex(key: SecretSpecifierValue, regexes?: RegExp[]): RegExp | undefined {
    return regexes?.find((regex) => regex.test(String(key)));
  }

  private static matchesAnyRegex(value: SecretSpecifierValue, regexes: RegExp[]): boolean {
    return regexes.some((regex) => regex.test(String(value)));
  }
}
