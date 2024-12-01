export class SecretManager {
  private secretKeys?: RegExp[];
  private secretObjectKeys?: RegExp[];

  constructor(secretKeys?: RegExp[], secretObjectKeys?: RegExp[]) {
    this.secretKeys = secretKeys;
    this.secretObjectKeys = secretObjectKeys;
  }

  /**
   * Determines if the given key is a secret key which should be redacted. If no secret
   * keys are provided assumes all keys are secret.
   * @param key The key to check.
   * @returns True if the key is a secret key, false otherwise.
   */
  public isSecretKey(key: string): boolean {
    if (!this.secretKeys) {
      return true;
    }
    return this.valueIsSecret(key, this.secretKeys);
  }

  /**
   * Determines if a key is a secret object key which should be redacted. If no secret
   * object keys are provided then assumes objects are not secret.
   * @param key The key to check.
   * @returns True if the key is a secret object key, false otherwise.
   */
  public isSecretObjectKey(key: string): boolean {
    if (!this.secretObjectKeys) {
      return false;
    }
    return this.valueIsSecret(key, this.secretObjectKeys);
  }

  private valueIsSecret(value: string, regexes?: RegExp[]): boolean {
    if (!regexes) {
      return true;
    }

    return this.valueMatchesAnyRegexValue(value, regexes);
  }

  private valueMatchesAnyRegexValue(value: string, regexes: RegExp[]): boolean {
    for (const regex of regexes) {
      if (regex.test(value)) {
        return true;
      }
    }

    return false;
  }
}
