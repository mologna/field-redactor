import { SecretManagerConfig } from './types';

export class SecretManager {
  private secretKeys?: RegExp[];
  private deepSecretKeys?: RegExp[];
  private fullSecretKeys?: RegExp[];

  constructor(config: SecretManagerConfig) {
    this.secretKeys = config.secretKeys;
    this.deepSecretKeys = config.deepSecretKeys;
    this.fullSecretKeys = config.fullSecretKeys;
  }

  /**
   * Determines if the given key is a secret. If no secrets provided then assumes
   * all keys are secret.
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
   * Determines if a key is a deep secret. If no deep secrets provided then assumes false.
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
   * Determines if a key is a secret object key which should be redacted. If no secret
   * object keys are provided then assumes objects are not secret.
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
