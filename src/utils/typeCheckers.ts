import { hashStrategies } from '../strategies';
import {
  BinaryToTextEncoding,
  binaryToTextEncoding,
  HASH_STRATEGIES
} from '../types';
import {
  HashStrategyConfig,
  RedactionStrategyConfig,
  SecretConfig,
  ValuesConfig
} from '../types/config';

export class TypeCheckers {
  public static isHashStrategyConfig(
    config: any
  ): config is HashStrategyConfig {
    const { type, algorithm, encoding, shouldFormat } = config;
    if (typeof type !== 'string' || type.localeCompare('hash') !== 0) {
      return false;
    } else if (!this.isHashStrategy(algorithm)) {
      return false;
    } else if (encoding && !this.isBinaryToTextEncoding(encoding)) {
      return false;
    } else if (!this.isBooleanOrUndefined(shouldFormat)) {
      return false;
    }

    return true;
  }

  public static isRedactionStrategyConfig(
    config: any
  ): config is RedactionStrategyConfig {
    const { type, replacementText } = config;
    if (type !== 'redaction') {
      return false;
    } else if (replacementText && typeof replacementText !== 'string') {
      return false;
    }

    return true;
  }

  public static isSecretConfig(config: any): config is SecretConfig {
    const { redactAll, deep, keys, ignoredKeys } = config;
    if (
      !this.isBooleanOrUndefined(redactAll) ||
      !this.isBooleanOrUndefined(deep)
    ) {
      return false;
    }

    if (keys !== undefined && !Array.isArray(keys)) {
      return false;
    }

    if (ignoredKeys !== undefined && !Array.isArray(ignoredKeys)) {
      return false;
    }

    return true;
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
