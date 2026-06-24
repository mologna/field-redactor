import { SecretManagerConfig, SecretSpecifierValue } from './types';

type KeyRule = 'remove' | 'opaque' | 'deep' | 'shallow';

/**
 * Utility class for managing secrets and determining if a  given value is a secret of any type. If no secrets of
 * any type are provided in the configuration then all values are considered secrets (but not deep or full secrets).
 */
export class SecretManager {
  private secretKeys?: RegExp[];
  private deepSecretKeys?: RegExp[];
  private fullSecretKeys?: RegExp[];
  private deleteSecretKeys?: RegExp[];

  constructor(config: SecretManagerConfig) {
    this.deepSecretKeys = config.deepSecretKeys;
    this.fullSecretKeys = config.fullSecretKeys;
    this.deleteSecretKeys = config.deleteSecretKeys;

    if (!config.secretKeys && (config.deepSecretKeys || config.fullSecretKeys || config.deleteSecretKeys)) {
      this.secretKeys = [];
    } else {
      this.secretKeys = config.secretKeys;
    }
  }

  /**
   * Determines if the given key is a secret. If no secrets of any type are provided then this function
   * always returns true.
   * @param key The key to check.
   * @returns True if the key is a secret key or no secret keys exist, otherwise false.
   */
  public isSecretKey(key: SecretSpecifierValue): boolean {
    if (!this.secretKeys) {
      return true;
    }

    return SecretManager.matchesAnyRegex(key, this.secretKeys);
  }

  /**
   * Determines if a key is a deep secret based on the deepSecretKeys configuration provided in the constructor.
   * @param key The key to check.
   * @returns True if the key is a deep secret key, otherwise false.
   */
  public isDeepSecretKey(key: SecretSpecifierValue): boolean {
    return !!this.deepSecretKeys && SecretManager.matchesAnyRegex(key, this.deepSecretKeys);
  }

  /**
   * Determines if a key is a full secret based on the fullSecretKeys configuration provided in the constructor.
   * @param key The key to check.
   * @returns True if the key is a full secret key, otherwise false.
   */
  public isFullSecretKey(key: SecretSpecifierValue): boolean {
    return !!this.fullSecretKeys && SecretManager.matchesAnyRegex(key, this.fullSecretKeys);
  }

  /**
   * Determines if a key is a delete secret based on the deleteSecretKeys configuration provided in the constructor.
   * @param key The key to check.
   * @returns True if the key is a delete secret key, otherwise false.
   */
  public isDeleteSecretKey(key: SecretSpecifierValue): boolean {
    return !!this.deleteSecretKeys && SecretManager.matchesAnyRegex(key, this.deleteSecretKeys);
  }

  public getKeyRulePattern(key: SecretSpecifierValue, rule: KeyRule): string | undefined {
    const match = SecretManager.findMatchingRegex(key, this.regexListFor(rule));
    return match ? SecretManager.formatRegex(match) : undefined;
  }

  public classifyKeyRule(key: SecretSpecifierValue): 'remove' | 'opaque' | 'deep' | 'shallow' | 'default' | null {
    if (this.isDeleteSecretKey(key)) {
      return 'remove';
    }

    if (this.isFullSecretKey(key)) {
      return 'opaque';
    }

    if (this.isDeepSecretKey(key)) {
      return 'deep';
    }

    if (this.isSecretKey(key)) {
      return this.secretKeys ? 'shallow' : 'default';
    }

    return null;
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

  private static formatRegex(regex: RegExp): string {
    return `/${regex.source}/${regex.flags}`;
  }

  private static matchesAnyRegex(value: SecretSpecifierValue, regexes: RegExp[]): boolean {
    return regexes.some((regex) => regex.test(String(value)));
  }
}
