import rfdc from 'rfdc';
import { Strategy } from '../../strategies';
import { Obfuscator } from '../obfuscator';
import { SecretParser } from '../../secrets';
import { RedactorConfig, Values } from '../../types/config';

export class ConfigObfuscatorImpl implements Obfuscator {
  private readonly strategy: Strategy;
  private readonly secretParser: SecretParser;
  private readonly values: Values;
  private readonly deepRedactSecrets: boolean;
  private deepCopy = rfdc({ proto: true, circles: true });

  constructor(
    config: RedactorConfig
  ) {
    const { strategy, secretParser, values, deepRedactSecrets } = config;
    this.strategy = strategy;
    this.secretParser = secretParser;
    this.values = values;
    this.deepRedactSecrets = deepRedactSecrets;
  }

  obfuscate(value: any) {
    if (typeof value !== 'object' || value instanceof Date) {
      return this.obfuscateValuesInPlace(value);
    }
    const copy = this.deepCopy(value);
    this.obfuscateValuesInPlace(copy);
    return copy;
  }

  private obfuscateValuesInPlace(value: any, key?: string, hasParentSecret?: boolean) {
    if (value === null || value === undefined) {
      return value;
    } else if (typeof value === 'boolean') {
      return this.obfuscateBoolean(value, key, hasParentSecret);
    } else if (typeof value === 'function') {
      return this.obfuscateFunction(value, key, hasParentSecret);
    } else if (value instanceof Date) {
      return this.obfuscateDate(value, key, hasParentSecret);
    } else if (typeof value !== 'object') {
      return this.obfuscateValue(value, key, hasParentSecret);
    }

    this.obfuscateObject(value, hasParentSecret);
    return value;
  }

  private obfuscateObject(object: any, secretParentKey?: boolean): void {
    for (const key of Object.keys(object)) {
      const redactAllChildren = secretParentKey || this.secretParser.isSecret(key) && !this.secretParser.isIgnored(key);
      object[key] = this.obfuscateValuesInPlace(object[key], key, redactAllChildren);
    }
  }

  private obfuscateBoolean(value: boolean, key?: string, secretParentKey?: boolean) {
    if (!this.values.booleans || !this.shouldRedactValue(key, secretParentKey)) {
      return value;
    }

    return this.strategy.execute(String(value));
  }

  private obfuscateDate(value: Date, key?: string, secretParentKey?: boolean) {
    if (!this.values.dates || !this.shouldRedactValue(key, secretParentKey)) {
      return value;
    }
    return this.strategy.execute(value.toISOString()); 
  }

  private obfuscateFunction(value: Function, key?: string, secretParentKey?: boolean) {
    if (!this.values.functions || !this.shouldRedactValue(key, secretParentKey)) {
      return value;
    }

    return this.strategy.execute(String(value));
  }

  private obfuscateValue(value: any, key?: string, secretParentKey?: boolean): any {
    if (!this.shouldRedactValue(key, secretParentKey)) {
      return value;
    }
    return this.strategy.execute(String(value));
  }

  private shouldRedactValue(key?: string, hasParentSecret?: boolean) {
    if (!key) {
      return true;
    } else if (this.secretParser.isIgnored(key)) {
      return false;
    } 
    
    return (this.deepRedactSecrets && hasParentSecret) || this.secretParser.isSecret(key);
  }
}