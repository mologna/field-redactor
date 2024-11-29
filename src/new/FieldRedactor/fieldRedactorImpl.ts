import rfdc from 'rfdc';
import { FieldRedactor } from './fieldRedactor';
import { FieldRedactorConfig } from './config';
import { SecretManager } from '../secret/secretManager';
import { Redactor } from '../redactor/redactor';

export class FieldRedactorImpl implements FieldRedactor {
  private deepCopy = rfdc({ proto: true, circles: true });
  private static DEFAULT_REDACTED_TEXT = 'REDACTED';
  private secretManager: SecretManager;
  private redactNullOrUndefined: boolean;
  private redactor: Redactor
  constructor(config?: FieldRedactorConfig) {
    this.redactNullOrUndefined = config?.redactNullOrUndefined || false;
    this.secretManager = new SecretManager(config?.secretKeys, config?.deepSecretKeys);
    const replacementText = config?.replacementText || FieldRedactorImpl.DEFAULT_REDACTED_TEXT;
    this.redactor = config?.redactor || ((val: any) => replacementText);
  } 


  public redact(value: any): any {
    if (!value || typeof value !== 'object' || (value instanceof Date)) {
      throw new Error("Input value must be a JSON object");
    }

    const copy = this.deepCopy(value);
    this.redactObjectFieldsInPlace(copy);
    return copy;
  }

  private redactObjectFieldsInPlace(object: any, isSecretObject: boolean = false): void {
    for (const key of Object.keys(object)) {
      if (!object[key]) {
        object[key] = this.redactNullOrUndefinedValue(key, isSecretObject);
      } else if (!object[key]) {
        continue;
      } else if (typeof object[key] !== 'object' || object[key] instanceof Date) { 
        object[key] = this.redactObjectFieldIfSecret(key, object[key], isSecretObject);
      } else {
        const secretObject = isSecretObject || this.secretManager.isSecretObjectKey(key);
        this.redactObjectFieldsInPlace(object[key], secretObject);
      }
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

  private redactNullOrUndefinedValue(key: string, isSecretObject: boolean): any {
    if (isSecretObject || this.redactNullOrUndefined && this.secretManager.isSecretKey(key)) {
      return this.redactor(null);
    }
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