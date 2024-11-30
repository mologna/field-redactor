import rfdc from 'rfdc';
import { FieldRedactor } from './fieldRedactor';
import { FieldRedactorConfig } from './config';
import { SecretManager } from '../secret/secretManager';
import { Redactor } from '../redactor/redactor';
import { CustomObjectRedactor } from './customObjectRedactor';

export class FieldRedactorImpl implements FieldRedactor {
  private deepCopy = rfdc({ proto: true, circles: true });
  private static DEFAULT_REDACTED_TEXT = 'REDACTED';
  private secretManager: SecretManager;
  private redactNullOrUndefined: boolean;
  private redactor: Redactor;
  private customObjectRedactor: CustomObjectRedactor;
  constructor(config?: FieldRedactorConfig) {
    this.redactNullOrUndefined = config?.redactNullOrUndefined || false;
    this.secretManager = new SecretManager(config?.secretKeys, config?.deepSecretKeys);
    const replacementText = config?.replacementText || FieldRedactorImpl.DEFAULT_REDACTED_TEXT;
    this.redactor = config?.redactor || ((val: any) => replacementText);
    this.customObjectRedactor = new CustomObjectRedactor(this.redactor);
    this.customObjectRedactor.setCustomObjects(config?.customObjects || []);
  } 


  public redact(value: any): any {
    if (!value || typeof value !== 'object' || (value instanceof Date)) {
      throw new Error("Input value must be a JSON object");
    }

    const copy = this.deepCopy(value);
    const customObject = this.customObjectRedactor.getMatchingCustomObject(copy);
    if (customObject) {
      this.customObjectRedactor.redactCustomObjectInPlace(copy, customObject);
    } else {
      this.redactObjectFieldsInPlace(copy);
    }

    return copy;
  }

  private redactObjectFieldsInPlace(object: any, isSecretObject: boolean = false): void {
    for (const key of Object.keys(object)) {
      if (!this.isObject(object[key])) {
        object[key] = this.redactFields(key, object[key], isSecretObject);
      } else {
        const customObject = this.customObjectRedactor.getMatchingCustomObject(object[key]);
        if (customObject) {
          this.customObjectRedactor.redactCustomObjectInPlace(object[key], customObject);
        } else {
          const secretObject = isSecretObject || this.secretManager.isSecretObjectKey(key);
          this.redactObjectFieldsInPlace(object[key], secretObject);
        }
      }
    }
  }

  private redactArrayFieldsInPlace(key: string, array: any[], isSecretObject: boolean): any[] {
    return array.map((value) => {
      if (!this.isObject(value)) {
        return this.redactFields(key, value, isSecretObject);
      } else {
        const secretObject = isSecretObject || this.secretManager.isSecretObjectKey(key);
        this.redactObjectFieldsInPlace(value, secretObject);
        return value;
      }
    });
  }

  private isObject(value: any) {
    return !!value && typeof value === 'object' && !(value instanceof Date) && !Array.isArray(value);
  }

  private redactFields(key: string, value: any, isSecretObject: boolean) {
    if (!value) {
      return this.redactNullOrUndefinedValue(key, value, isSecretObject);
    } else if (Array.isArray(value)) {
      return this.redactArrayFieldsInPlace(key, value, isSecretObject);
    } else {
      return this.redactObjectFieldIfSecret(key, value, isSecretObject);
    }
  }

  private redactObjectFieldIfSecret(key: string, value: any, forceRedaction: boolean): any {
    if (forceRedaction || this.secretManager.isSecretKey(key)) {
      return this.redactValue(value);
    }

    return value;
  }

  private redactValue(value: any) {
    if (typeof value === 'boolean') {
      return this.redactBoolean(value);
    } else if (typeof value === 'function') {
      return this.redactFunction(value);
    } else if (value instanceof Date) {
      return this.redactDate(value);
    }

    return this.redactAny(value);
  }

  private redactNullOrUndefinedValue(key: string, value: null | undefined, isSecretObject: boolean): any {
    if (isSecretObject || this.redactNullOrUndefined && this.secretManager.isSecretKey(key)) {
      return this.redactor(null);
    }

    return value;
  }

  private redactBoolean(value: boolean): string {
    return this.redactor(value);
  }

  private redactFunction(value: Function): string {
    return this.redactor(value);
  }

  private redactDate(value: Date): string {
    return this.redactor(value);
  }

  private redactAny(value: any): string {
    return this.redactor(value);
  }
}