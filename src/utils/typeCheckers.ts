import { hashStrategies } from '../strategies';
import {
  BinaryToTextEncoding,
  binaryToTextEncoding,
  HASH_STRATEGIES
} from '../types';
import {
  SecretConfig,
  ValuesConfig
} from '../types/config';

export class TypeCheckers {
  public static isSecretConfig(config: any): config is SecretConfig {
    const { redactAll, deep, keys, ignoredKeys } = config;
    if (
      !this.isBooleanOrUndefined(redactAll) ||
      !this.isBooleanOrUndefined(deep)
    ) {
      return false;
    }

    if (keys !== undefined && !TypeCheckers.isArrayOfRegExp(keys)) {
      return false;
    }

    if (
      ignoredKeys !== undefined &&
      !TypeCheckers.isArrayOfRegExp(ignoredKeys)
    ) {
      return false;
    }

    return true;
  }

  private static isArrayOfRegExp(value: any): boolean {
    if (!Array.isArray(value)) {
      return false;
    }

    return !value.some((item) => !(item instanceof RegExp));
  }

  public static isValuesConfig(config: any): config is ValuesConfig {
    const { booleans, dates, functions } = config;
    return (
      this.isBooleanOrUndefined(booleans) &&
      this.isBooleanOrUndefined(dates) &&
      this.isBooleanOrUndefined(functions)
    );
  }

  public static isHashStrategy = (val: any): val is HASH_STRATEGIES => {
    return hashStrategies.includes(val);
  };

  public static isBinaryToTextEncoding(val: any): val is BinaryToTextEncoding {
    return binaryToTextEncoding.includes(val);
  }

  private static isBooleanOrUndefined(
    value: any
  ): value is boolean | undefined {
    if (value === undefined) {
      return true;
    }

    return value !== null && typeof value === 'boolean';
  }
}
