import rfdc from 'rfdc';
import { Strategy } from '../../strategies';
import { DataObfuscator } from '../dataObfuscator';
import { DataObfuscatorOptions } from '../dataObfuscatorOptions';

// TODO - Add config parameter to allow for things like formatting, conditionally ignoring booleans, etc

export class DataObfuscatorImpl implements DataObfuscator {
  private deepCopy = rfdc({ proto: true, circles: true });
  constructor(
    private strategy: Strategy,
    private readonly options?: DataObfuscatorOptions
  ) {}

  public obfuscateValues(value: any): any {
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
      return this.strategy.execute(String(value));
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
    return this.options?.values?.functions
      ? this.strategy.execute(value.toString())
      : value;
  }

  private handleDate(value: Date): Date | string {
    return this.options?.values?.dates
      ? this.strategy.execute(value.toISOString())
      : value;
  }

  private handleBoolean(value: boolean) {
    return this.options?.values?.booleans
      ? this.strategy.execute(String(value))
      : value;
  }

  private obfuscateObjectValuesInPlace(object: any): void {
    for (const key of Object.keys(object)) {
      object[key] = this.obfuscateValuesInPlace(object[key]);
    }
  }
}
