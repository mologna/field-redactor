import { SecretConfig } from '../../types/config';
import { SecretParser } from '../secretParser';

export class SecretParserImpl implements SecretParser {
  private keys: RegExp[];
  private ignoredKeys: RegExp[];
  private redactAll: boolean;
  constructor(config: SecretConfig) {
    const { redactAll, keys, ignoredKeys } = config;
    this.keys = keys || [];
    this.redactAll = redactAll || false;
    this.ignoredKeys = ignoredKeys || [];
  }

  public isSecret(str: string): boolean {
    return this.redactAll || this.testStringAgainstList(str, this.keys);
  }

  public isIgnored(str: string): boolean {
    return this.testStringAgainstList(str, this.ignoredKeys);
  }

  private testStringAgainstList(str: string, list: RegExp[]): boolean {
    return list.some((regex) => regex.test(str));
  }
}
