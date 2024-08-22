import rfdc from 'rfdc';
import { Strategy } from '../../strategies';
import { Obfuscator } from '../obfuscator';
import { SecretParser } from '../../secrets';
import { Values } from '../../types/config';

export class ConfigObfuscatorImpl implements Obfuscator {
  private deepCopy = rfdc({ proto: true, circles: true });
  constructor(
    private readonly strategy: Strategy,
    private readonly secretParser: SecretParser,
    private readonly values: Values,
    private readonly obfuscateAll: boolean
  ) {

  }

  obfuscate(value: any) {
    const copy = this.deepCopy(value);
    throw new Error('Method not implemented.');
  }

  private obfuscateValuesInPlace(value: any, key?: string) {
    if (value === null || value === undefined) {
      return value;
    } else if (typeof value === 'boolean') {
      return this.obfuscateBoolean(value, key);
    } else if (typeof value === 'function') {
      return this.obfuscateFunction(value, key);
    } else if (value instanceof Date) {
      return this.obfuscateDate(value, key);
    } else if (value !== 'object') {
      return this.obfuscateValue(value);
    }

    this.obfuscateObject(value, key);
  }

  private obfuscateObject(object: any, parentKey?: string): void {
    for (const key of Object.keys(object)) {
      object[key] = this.obfuscateValuesInPlace(object, key);
    }
  }

  private obfuscateBoolean(value: boolean, key?: string) {
    if (!this.values.booleans || !this.shouldRedactValue(key)) {
      return value;
    }

    return this.strategy.execute(String(value));
  }

  private obfuscateDate(value: Date, key?: string) {
    if (!this.values.dates || !this.shouldRedactValue(key)) {
      return value;
    }

    return this.strategy.execute(value.toISOString()); 
  }

  private obfuscateFunction(value: Function, key?: string) {
    if (!this.values.functions || !this.shouldRedactValue(key)) {
      return value;
    }

    return this.strategy.execute(String(value));
  }

  private obfuscateValue(value: any) {
    return this.strategy.execute(String(value));
  }

  private shouldRedactValue(key?: string) {
    return this.obfuscateAll || key && this.isNotIgnoredSecretKey(key);
  }

  private isNotIgnoredSecretKey(key?: string) {
    if (!key || this.secretParser.isIgnored(key)) {
      return false;
    }

    return this.secretParser.isSecret(key);
  }
}