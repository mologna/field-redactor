import rfdc from 'rfdc';
import { Strategy } from '../../strategies';
import { Obfuscator } from '../obfuscator';
import { ObfuscatorOptions } from '../obfuscatorOptions';
import { Formatter } from '../../formatter';

export class ObfuscatorImpl implements Obfuscator {
  private deepCopy = rfdc({ proto: true, circles: true });
  private formatter?: Formatter;

  constructor(
    private strategy: Strategy,
    private readonly options: ObfuscatorOptions
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
    const shouldObfuscate = this.shouldObfuscateKey(key);
    if (value === null || value === undefined) {
      return value;
    } else if (typeof value === 'boolean') {
      return this.obfuscateBoolean(value, shouldObfuscate);
    } else if (typeof value === 'function') {
      return this.obfuscateFunction(value, shouldObfuscate);
    } else if (value instanceof Date) {
      return this.obfuscateDate(value, shouldObfuscate);
    } else if (typeof value !== 'object') {
      return this.obfuscateGeneric(value, shouldObfuscate);
    } else if (Array.isArray(value)) {
      return this.obfuscateArray(value, key);
    }

    this.obfuscateObject(value, key);
    return value;
  }

  private obfuscateArray(
    array: Array<any>,
    key?: string | boolean
  ): Array<any> {
    return array.map((val) => this.obfuscateValuesInPlace(val, key));
  }

  private obfuscateFunction(
    value: Function,
    shouldObfuscate: boolean
  ): Function | string {
    return shouldObfuscate && this.options.values.functions
      ? this.obfuscateValue(value)
      : value;
  }

  private obfuscateDate(value: Date, shouldObfuscate: boolean): Date | string {
    return this.options.values.dates && shouldObfuscate
      ? this.obfuscateValue(value.toISOString())
      : value;
  }

  private obfuscateBoolean(
    value: boolean,
    shouldObfuscate: boolean
  ): string | boolean {
    return shouldObfuscate && this.options.values.booleans
      ? this.obfuscateValue(value)
      : value;
  }

  private obfuscateObject(object: any, parentKey?: string | boolean): void {
    for (const key of Object.keys(object)) {
      const obfuscateAllNestedValues = this.shouldObfuscateAllNestedValues(
        key,
        parentKey
      );
      object[key] = this.obfuscateValuesInPlace(
        object[key],
        obfuscateAllNestedValues || key
      );
    }
  }

  private shouldObfuscateAllNestedValues(
    key: string,
    parentKey?: string | boolean
  ) {
    if (this.options.secrets?.shouldNotFollow) {
      return false;
    } else {
      return parentKey === true || this.shouldObfuscateKey(key);
    }
  }

  private obfuscateGeneric(value: any, shouldObfuscate: boolean) {
    return shouldObfuscate ? this.obfuscateValue(value) : value;
  }

  private obfuscateValue(value: any): any {
    const obfuscated = this.strategy.execute(String(value));
    if (this.formatter) {
      return this.formatter.format(obfuscated);
    } else {
      return obfuscated;
    }
  }

  private shouldObfuscateKey(key?: string | boolean): boolean {
    if (!this.options.secrets) {
      return true;
    } else if (typeof key === 'boolean') {
      return key;
    } else {
      return key ? this.options.secrets.parser.isSecretKey(key) : false;
    }
  }
}
