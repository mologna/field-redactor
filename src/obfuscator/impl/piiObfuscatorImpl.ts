import rfdc from 'rfdc';
import { Strategy } from '../../strategies';
import { Obfuscator } from '../obfuscator';
import { PiiObfuscatorOptions } from '../obfuscatorOptions';
import { Formatter } from '../../formatter';

export class PiiObfuscatorImpl implements Obfuscator {
  private deepCopy = rfdc({ proto: true, circles: true });
  private formatter?: Formatter;

  constructor(
    private strategy: Strategy,
    private readonly options: PiiObfuscatorOptions
  ) {
    if (options.formatter) {
      this.formatter = options.formatter;
    }
  }

  obfuscate(value: any) {
    const copy = this.deepCopy(value);
    return this.obfuscateValuesInPlace(copy);
  }

  private obfuscateValuesInPlace(value: any, key?: string | boolean): any {
    if (value === null || value === undefined) {
      return value;
    } else if (typeof value === 'boolean') {
      return this.handleBoolean(value, key);
    } else if (typeof value === 'function') {
      return this.obfuscateFunction(value, key);
    } else if (value instanceof Date) {
      return this.obfuscateDate(value, key);
    } else if (typeof value !== 'object') {
      return this.obfuscateValue(String(value), key);
    } else if (Array.isArray(value)) {
      return this.obfuscateArray(value, key);
    }

    this.obfuscateObjectValuesInPlace(value, key);
    return value;
  }

  private obfuscateArray(array: Array<any>, key?: string | boolean) {
    if (this.shouldObfuscateKey(key)) {
      return array.map((val) => this.obfuscateValuesInPlace(val, key));
    } else {
      return array;
    }
  }

  private obfuscateFunction(value: Function, key?: string | boolean): Function | string {
    if (this.shouldObfuscateKey(key)) {
      return this.options.values.functions ? this.obfuscateValue(value) : value;
    }

    return value;
  }

  private obfuscateDate(value: Date, key?: string | boolean): Date | string {
    if (this.shouldObfuscateKey(key)) {
      return this.options.values.dates
      ? this.obfuscateValue(value.toISOString())
      : value; 
    }

    return value;
  }

  private handleBoolean(value: boolean, key?: string | boolean) {
    if (this.shouldObfuscateKey(key)) {
      return this.options.values.booleans ? this.obfuscateValue(value) : value;
    }

    return value;
  }

  private obfuscateObjectValuesInPlace(object: any, key?: string | boolean): void {
      for (const key of Object.keys(object)) {
        const obfuscateAllNestedValues = this.shouldObfuscateKey(key);
        object[key] = this.obfuscateValuesInPlace(object[key], obfuscateAllNestedValues || key);
      }
  }

  private obfuscateValue(value: any, key?: string | boolean): string {
    if (!this.shouldObfuscateKey(key)) {
      return value;
    }

    const obfuscated = this.strategy.execute(String(value));
    if (this.formatter) {
      return this.formatter.format(obfuscated);
    } else {
      return obfuscated;
    }
  }

  private shouldObfuscateKey(key?: string | boolean): boolean {
    if (typeof key === 'boolean') {
      return key;
    }
    return key ? this.options.secret.isSecretKey(key) : false;
  }
}