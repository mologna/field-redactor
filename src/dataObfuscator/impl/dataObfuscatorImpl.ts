import { DataObfuscator } from '../dataObfuscator';
import { BaseDataObfuscator } from './baseDataObfuscator';

// TODO - Add config parameter to allow for things like formatting, conditionally ignoring booleans, etc

export class DataObfuscatorImpl
  extends BaseDataObfuscator
  implements DataObfuscator
{
  public obfuscateValues(value: any): any {
    if (value === null || value === undefined) {
      return value;
    } else if (this.isSpecificType(value)) {
      return this.handleSpecificType(value);
    } else if (typeof value !== 'object') {
      return this.strategy.execute(String(value));
    } else if (Array.isArray(value)) {
      return this.obfuscateArray(value);
    }

    const copy = this.deepCopy(value);
    this.obfuscateObjectValuesInPlace(copy);
    return copy;
  }

  private obfuscateArray(array: Array<any>) {
    return array.map(this.obfuscateValues.bind(this));
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
      const val = object[key];
      if (val === null || val === undefined) {
        object[key] = val;
      } else if (this.isSpecificType(val)) {
        object[key] = this.handleSpecificType(val);
      } else if (typeof val !== 'object') {
        object[key] = this.strategy.execute(String(val));
      } else {
        this.obfuscateObjectValuesInPlace(val);
      }
    }
  }
}
