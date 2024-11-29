export class SecretManager {
  private secretKeys?: RegExp[];

  constructor(secretKeys?: RegExp[]) {
    this.secretKeys = secretKeys;
  }

  public isSecretKey(key: string): boolean {
    if (!this.secretKeys) {
      return true;
    }

    for (const secretKey of this.secretKeys) {
      if (secretKey.test(key)) {
        return true;
      }
    }

    return false;
  }
}