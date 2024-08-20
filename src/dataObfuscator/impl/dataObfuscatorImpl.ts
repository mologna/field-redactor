import rfdc from 'rfdc';
import { Strategy } from '../../strategies';
import { DataObfuscator } from '../dataObfuscator';

// TODO - Add config parameter to allow for things like formatting, conditionally ignoring booleans, etc

export class DataObfuscatorImpl implements DataObfuscator {
  protected deepCopy = rfdc({ proto: true, circles: true });
  constructor(protected strategy: Strategy) {}

  public obfuscateValues(value: any): any {
    const copy = this.deepCopy(value);
    return this.obfuscateValuesInPlace(copy);
  }

  private obfuscateValuesInPlace(value: any): any {
    if (value === null || value === undefined) {
      return value;
    } else if (this.isSpecificType(value)) {
      return this.handleSpecificType(value);
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

  private isSpecificType(value: any): boolean {
    return (
      typeof value === 'boolean' ||
      typeof value === 'function' ||
      value instanceof Date
    );
  }

  private handleSpecificType(
    value: boolean | Function | Date
  ): boolean | Function | string {
    if (typeof value === 'boolean') {
      return value;
    } else if (typeof value === 'function') {
      return value;
    }

    return this.strategy.execute(value.toISOString());
  }

  private obfuscateObjectValuesInPlace(object: any): void {
    for (const key of Object.keys(object)) {
      object[key] = this.obfuscateValuesInPlace(object[key]);
    }
  }
}
