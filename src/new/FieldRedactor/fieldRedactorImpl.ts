import rfdc from 'rfdc';
import { FieldRedactor } from './fieldRedactor';
import { FieldRedactorConfig } from './config';
import { SecretManager } from '../secret/secretManager';
import { Redactor } from '../redactor/redactor';

export class FieldRedactorImpl implements FieldRedactor {
  private deepCopy = rfdc({ proto: true, circles: true });
  private DEFAULT_REDACTED_TEXT = 'REDACTED';
  private redactedText: string;
  private secretManager: SecretManager;
  private redactor: Redactor
  constructor(config?: FieldRedactorConfig) {
    this.redactedText = config?.replacementText || this.DEFAULT_REDACTED_TEXT;
    this.secretManager = new SecretManager(config?.secretKeys, config?.deepSecretKeys);
    this.redactor = config?.redactor || ((val: any) => this.redactedText);
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
      if (!object[key] && this.secretManager.isSecretKey(key)) {
        object[key] = this.redactNullOrUndefined();
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

  private redactNullOrUndefined(): any {
    return this.redactor(null);
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