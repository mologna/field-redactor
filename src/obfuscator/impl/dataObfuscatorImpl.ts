import rfdc from 'rfdc';
import { Strategy } from '../../strategies';
import { Obfuscator } from '../obfuscator';
import { ObfuscatorOptions } from '../obfuscatorOptions';
import { Formatter } from '../../formatter';

export class DataObfuscatorImpl implements Obfuscator {
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

  public obfuscate(value: any): any {
    const copy = this.deepCopy(value);
    return this.obfuscateValuesInPlace(copy);
  }

  private obfuscateValuesInPlace(value: any): any {
    if (value === null || value === undefined) {
      return value;
    } else if (typeof value === 'boolean') {
      return this.handleBoolean(value);
    } else if (typeof value === 'function') {
      return this.handleFunction(value);
    } else if (value instanceof Date) {
      return this.handleDate(value);
    } else if (typeof value !== 'object') {
      return this.obfuscateValue(String(value));
    } else if (Array.isArray(value)) {
      return this.obfuscateArray(value);
    }

    this.obfuscateObjectValuesInPlace(value);
    return value;
  }

  private obfuscateArray(array: Array<any>) {
    return array.map(this.obfuscateValuesInPlace.bind(this));
  }

  private handleFunction(value: Function): Function | string {
    return this.options.values.functions ? this.obfuscateValue(value) : value;
  }

  private handleDate(value: Date): Date | string {
    return this.options.values.dates
      ? this.obfuscateValue(value.toISOString())
      : value;
  }

  private handleBoolean(value: boolean) {
    return this.options.values.booleans ? this.obfuscateValue(value) : value;
  }

  private obfuscateObjectValuesInPlace(object: any): void {
    for (const key of Object.keys(object)) {
      object[key] = this.obfuscateValuesInPlace(object[key]);
    }
  }

  private obfuscateValue(value: any): string {
    const obfuscated = this.strategy.execute(String(value));
    if (this.formatter) {
      return this.formatter.format(obfuscated);
    } else {
      return obfuscated;
    }
  }
}
