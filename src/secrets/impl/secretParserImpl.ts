import { SecretParser } from '../secretParser';
export class SecretParserImpl implements SecretParser {
  private keys: RegExp[];
  private ignoredKeys: RegExp[];

  constructor(keys: RegExp[], ignoredKeys: RegExp[] = []) {
    this.keys = keys;
    this.ignoredKeys = ignoredKeys;
  }

  public isSecret(str: string): boolean {
    return this.isIgnored(str)
      ? false
      : this.testStringAgainstList(str, this.keys);
  }

  public isIgnored(str: string): boolean {
    return this.testStringAgainstList(str, this.ignoredKeys);
  }

  private testStringAgainstList(str: string, list: RegExp[]): boolean {
    return list.some((regex) => regex.test(str));
  }
}
