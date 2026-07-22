import { formatRegExp } from '../util/regexUtils';
import { SecretManagerConfig, SecretSpecifierValue } from '../types';

export type KeyRule = 'remove' | 'opaque' | 'deep' | 'shallow';

const KEY_RULE_PRECEDENCE: KeyRule[] = ['remove', 'opaque', 'deep', 'shallow'];

/**
 * Utility class for managing secrets and determining if a given value is a secret of any type. If no secrets of
 * any type are provided in the configuration then all values are considered secrets (but not deep or full secrets).
 */
export class SecretManager {
  private secretKeys?: RegExp[];
  private deepSecretKeys?: RegExp[];
  private fullSecretKeys?: RegExp[];
  private deleteSecretKeys?: RegExp[];
  private passKeys?: RegExp[];

  constructor(config: SecretManagerConfig) {
    this.deepSecretKeys = config.deepSecretKeys;
    this.fullSecretKeys = config.fullSecretKeys;
    this.deleteSecretKeys = config.deleteSecretKeys;
    this.passKeys = config.passKeys;

    if (!config.secretKeys && (config.deepSecretKeys || config.fullSecretKeys || config.deleteSecretKeys)) {
      this.secretKeys = [];
    } else {
      this.secretKeys = config.secretKeys;
    }
  }

  /**
   * Determines if the given key is a secret. If no secrets of any type are provided then this function
   * always returns true.
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

  public isFullSecretKey(key: SecretSpecifierValue): boolean {
    return this.matchesRule(key, 'opaque');
  }

  public isDeleteSecretKey(key: SecretSpecifierValue): boolean {
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
        return this.deleteSecretKeys;
      case 'opaque':
        return this.fullSecretKeys;
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
