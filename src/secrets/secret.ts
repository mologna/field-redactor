import { SECRET_KEYS } from './secretKeys';

export type SecretConfig = {
  keys?: RegExp[];
  ignoredKeys?: RegExp[];
};

export class Secret {
  private keys: RegExp[];
  private ignoredKeys: RegExp[];

  constructor(config?: SecretConfig) {
    this.keys = config?.keys || SECRET_KEYS;
    this.ignoredKeys = config?.ignoredKeys || [];
  }

  public isSecretKey(str: string): boolean {
    return this.isIgnoredKey(str)
      ? false
      : this.testStringAgainstList(str, this.keys);
  }

  public isIgnoredKey(str: string): boolean {
    return this.testStringAgainstList(str, this.ignoredKeys);
  }

  private testStringAgainstList(str: string, list: RegExp[]): boolean {
    return list.some((regex) => regex.test(str));
  }
}
