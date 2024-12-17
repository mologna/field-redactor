import rfdc from 'rfdc';
import { FieldRedactorConfig } from './types';
import { SecretManager } from './secretManager';
import { Redactor } from './redactor';
import { CustomObjectRedactor } from './customObjectRedactor';

export class FieldRedactor {
  private deepCopy = rfdc({ proto: true, circles: true });
  private static DEFAULT_REDACTED_TEXT = 'REDACTED';
  private secretManager: SecretManager;
  private redactNullOrUndefined: boolean;
  private redactor: Redactor;
  private customObjectRedactor: CustomObjectRedactor;
  private readonly ignoreBooleans: boolean = false;
  private readonly ignoreDates: boolean = false;
  constructor(config?: FieldRedactorConfig) {
    this.redactNullOrUndefined = config?.redactNullOrUndefined || false;
    this.secretManager = new SecretManager(config?.secretKeys, config?.deepSecretKeys);
    const replacementText = config?.replacementText || FieldRedactor.DEFAULT_REDACTED_TEXT;
    this.redactor = config?.redactor || ((val: any) => Promise.resolve(replacementText));
    this.customObjectRedactor = new CustomObjectRedactor(this.secretManager, this.redactor);
    this.customObjectRedactor.setCustomObjects(config?.customObjects || []);
    this.ignoreBooleans = config?.ignoreBooleans || false;
    this.ignoreDates = config?.ignoreDates || false;
  }

  /**
   * Redacts the fields of a JSON object based on the configuration provided.
   * @param value The JSON value to redact
   * @returns The redacted JSON object.
   */
  public async redact(value: any): Promise<any> {
    if (!value || typeof value !== 'object' || value instanceof Date) {
      throw new Error('Input value must be a JSON object');
    }

    const copy = this.deepCopy(value);
    const customObject = this.customObjectRedactor.getMatchingCustomObject(copy);
    if (customObject) {
      await this.customObjectRedactor.redactCustomObjectInPlace(copy, customObject);
    } else {
      await this.redactObjectFieldsInPlace(copy);
    }

    return copy;
  }

  private async redactObjectFieldsInPlace(object: any, isSecretObject: boolean = false): Promise<void> {
    for (const key of Object.keys(object)) {
      if (!this.isObject(object[key])) {
        object[key] = await this.redactFields(key, object[key], isSecretObject);
      } else {
        const customObject = this.customObjectRedactor.getMatchingCustomObject(object[key]);
        if (customObject) {
          await this.customObjectRedactor.redactCustomObjectInPlace(object[key], customObject);
        } else {
          const secretObject = isSecretObject || this.secretManager.isSecretObjectKey(key);
          await this.redactObjectFieldsInPlace(object[key], secretObject);
        }
      }
    }
  }

  private async redactArrayFieldsInPlace(key: string, array: any[], isSecretObject: boolean): Promise<any[]> {
    const promises: Promise<any>[] = array.map(async (value) => {
      if (!this.isObject(value)) {
        return this.redactFields(key, value, isSecretObject);
      } else {
        const customObject = this.customObjectRedactor.getMatchingCustomObject(value);
        if (customObject) {
          await this.customObjectRedactor.redactCustomObjectInPlace(value, customObject);
          return Promise.resolve(value);
        } else {
          const secretObject = isSecretObject || this.secretManager.isSecretObjectKey(key);
          await this.redactObjectFieldsInPlace(value, secretObject);
          return Promise.resolve(value);
        }
      }
    });

    return Promise.all(promises);
  }

  private isObject(value: any) {
    return !!value && typeof value === 'object' && !(value instanceof Date) && !Array.isArray(value);
  }

  private async redactFields(key: string, value: any, isSecretObject: boolean): Promise<any> {
    if (!value) {
      return this.redactNullOrUndefinedValue(key, value, isSecretObject);
    } else if (Array.isArray(value)) {
      return this.redactArrayFieldsInPlace(key, value, isSecretObject);
    } else {
      return this.redactObjectFieldIfSecret(key, value, isSecretObject);
    }
  }

  private async redactObjectFieldIfSecret(key: string, value: any, forceRedaction: boolean): Promise<any> {
    if (forceRedaction || this.secretManager.isSecretKey(key)) {
      return this.redactValue(value);
    }

    return value;
  }

  private async redactValue(value: any) {
    if (typeof value === 'boolean') {
      return this.redactBoolean(value);
    } else if (value instanceof Date) {
      return this.redactDate(value);
    }

    return this.redactAny(value);
  }

  private async redactNullOrUndefinedValue(
    key: string,
    value: null | undefined,
    isSecretObject: boolean
  ): Promise<null | undefined | string> {
    if (isSecretObject || (this.redactNullOrUndefined && this.secretManager.isSecretKey(key))) {
      return this.redactor(null);
    }

    return Promise.resolve(value);
  }

  private async redactBoolean(value: boolean): Promise<boolean | string> {
    return this.ignoreBooleans ? Promise.resolve(value) : this.redactor(value);
  }

  private async redactDate(value: Date): Promise<Date | string> {
    return this.ignoreDates ? Promise.resolve(value) : this.redactor(value);
  }

  private async redactAny(value: any): Promise<string> {
    return this.redactor(value);
  }
}
