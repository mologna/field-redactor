import rfdc from 'rfdc';
import { FunctionalStrategy } from '../../strategies';
import { FieldRedactor } from '../fieldRedactor';
import { SecretParser } from '../../secrets';
import { RedactorConfig, SpecialObjects, Values } from '../../types/config';

export class FieldRedactorImpl implements FieldRedactor {
  private readonly redactor: FunctionalStrategy;
  private readonly secretParser: SecretParser;
  private readonly values: Values;
  private readonly deepRedactSecrets: boolean;
  private readonly specialObjects: SpecialObjects;
  private readonly strictMatchSpecialObjects: boolean;
  private deepCopy = rfdc({ proto: true, circles: true });

  constructor(config: RedactorConfig) {
    this.redactor = config.redactor;
    this.secretParser = config.secretParser;
    this.values = config.values;
    this.deepRedactSecrets = config.deepRedactSecrets;
    this.specialObjects = config.specialObjects || {};
    this.strictMatchSpecialObjects = config.strictMatchSpecialObjects || false;
  }

  redact(value: any) {
    if (typeof value !== 'object' || value instanceof Date) {
      return this.obfuscateValuesInPlace(value);
    }
    const copy = this.deepCopy(value);
    this.obfuscateValuesInPlace(copy);
    return copy;
  }

  private obfuscateValuesInPlace(
    value: any,
    key?: string,
    hasParentSecret?: boolean
  ) {
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
    } else if (this.isSpecialObject(value, key)) {
      this.obfuscateSpecialObject(value, key!);
      return value;
    }

    this.obfuscateObject(value, hasParentSecret);
    return value;
  }

  private isSpecialObject(value: any, key?: string): boolean {
    if (!key || !Object.keys(this.specialObjects).includes(key)) {
      return false;
    }

    if (!this.strictMatchSpecialObjects) {
      return true;
    }

    const format = this.specialObjects[key];
    return (
      this.formatMatchesObject(value, format) &&
      this.formatMatchesObject(format, value)
    );
  }

  private formatMatchesObject(object: any, format: any): boolean {
    for (const key of Object.keys(format)) {
      if (object[key] === undefined) return false;
      if (typeof object[key] === 'object') {
        if (!this.formatMatchesObject(object[key], format[key])) {
          return false;
        }
      }
    }
    return true;
  }

  private obfuscateObject(object: any, secretParentKey?: boolean): void {
    for (const key of Object.keys(object)) {
      const redactAllChildren =
        secretParentKey ||
        (this.secretParser.isSecret(key) && !this.secretParser.isIgnored(key));
      object[key] = this.obfuscateValuesInPlace(
        object[key],
        key,
        redactAllChildren
      );
    }
  }

  private obfuscateSpecialObject(object: any, key: string): void {
    const format: any = this.specialObjects[key];
    this.obfuscateSpecialObjectInternal(format, object);
  }

  private obfuscateSpecialObjectInternal(format: any, object: any): void {
    Object.keys(format).forEach((key) => {
      const shouldObfuscate = format[key];
      if (typeof shouldObfuscate === 'boolean') {
        object[key] = shouldObfuscate
          ? this.redactor(String(object[key]))
          : object[key];
      } else {
        this.obfuscateSpecialObjectInternal(format[key], object[key]);
      }
    });
  }

  private obfuscateBoolean(
    value: boolean,
    key?: string,
    secretParentKey?: boolean
  ) {
    if (
      !this.values.booleans ||
      !this.shouldRedactValue(key, secretParentKey)
    ) {
      return value;
    }

    return this.redactor(String(value));
  }

  private obfuscateDate(value: Date, key?: string, secretParentKey?: boolean) {
    if (!this.values.dates || !this.shouldRedactValue(key, secretParentKey)) {
      return value;
    }
    return this.redactor(value.toISOString());
  }

  private obfuscateFunction(
    value: Function,
    key?: string,
    secretParentKey?: boolean
  ) {
    if (
      !this.values.functions ||
      !this.shouldRedactValue(key, secretParentKey)
    ) {
      return value;
    }

    return this.redactor(String(value));
  }

  private obfuscateValue(
    value: any,
    key?: string,
    secretParentKey?: boolean
  ): any {
    if (!this.shouldRedactValue(key, secretParentKey)) {
      return value;
    }
    return this.redactor(String(value));
  }

  private shouldRedactValue(key?: string, hasParentSecret?: boolean) {
    if (!key) {
      return true;
    } else if (this.secretParser.isIgnored(key)) {
      return false;
    }

    return (
      (this.deepRedactSecrets && hasParentSecret) ||
      this.secretParser.isSecret(key)
    );
  }
}
