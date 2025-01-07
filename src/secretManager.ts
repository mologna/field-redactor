import { SecretManagerConfig } from './types';

/**
 * Utility class for managing secrets and determining if a  given value is a secret of any type. If no secrets of
 * any type are provided in the configuration then all values are considered secrets (but not deep or full secrets).
 */
export class SecretManager {
  private secretKeys?: RegExp[];
  private deepSecretKeys?: RegExp[];
  private fullSecretKeys?: RegExp[];

  constructor(config: SecretManagerConfig) {
    this.deepSecretKeys = config.deepSecretKeys;
    this.fullSecretKeys = config.fullSecretKeys;

    if (!config.secretKeys && (config.deepSecretKeys || config.fullSecretKeys)) {
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
  public isSecretKey(key: string): boolean {
    if (!this.secretKeys) {
      return true;
    }

    return SecretManager.valueMatchesAnyRegexValue(key, this.secretKeys);
  }

  /**
   * Determines if a key is a deep secret based on the deepSecretKeys configuration provided in the constructor.
   * @param key The key to check.
   * @returns True if the key is a deep secret key, otherwise false.
   */
  public isDeepSecretKey(key: string): boolean {
    if (!this.deepSecretKeys) {
      return false;
    }

    return SecretManager.valueMatchesAnyRegexValue(key, this.deepSecretKeys);
  }

  /**
   * Determines if a key is a full secret based on the fullSecretKeys configuration provided in the constructor.
   * @param key The key to check.
   * @returns True if the key is a full secret key, otherwise false.
   */
  public isFullSecretKey(key: string): boolean {
    if (!this.fullSecretKeys) {
      return false;
    }

    return SecretManager.valueMatchesAnyRegexValue(key, this.fullSecretKeys);
  }

  private static valueMatchesAnyRegexValue(value: string, regexes: RegExp[]): boolean {
    return regexes.some((regex) => regex.test(value));
  }
}
