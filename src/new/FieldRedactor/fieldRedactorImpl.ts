import rfdc from 'rfdc';
import { FieldRedactor } from './fieldRedactor';
import { FieldRedactorConfig } from './config';

export class FieldRedactorImpl implements FieldRedactor {
  private deepCopy = rfdc({ proto: true, circles: true });
  private DEFAULT_REDACTED_TEXT = 'REDACTED';
  private redactedText: string;
  constructor(config?: FieldRedactorConfig) {
    this.redactedText = config?.replacementText || this.DEFAULT_REDACTED_TEXT;
  } 


  public redact(value: any): any {
    if (!value || typeof value !== 'object' || (value instanceof Date)) {
      throw new Error("Input value must be a JSON object");
    }

    const copy = this.deepCopy(value);
    this.redactObjectFieldsInPlace(copy);
    return copy;
  }

  private redactObjectFieldsInPlace(object: any, key?: string) {
    for (const key of Object.keys(object)) {
      if (!object[key]) {
        object[key] = this.redactNullOrUndefined();
      }
      
      if (typeof object[key] !== 'object' || object[key] instanceof Date) { 
        object[key] = this.redactValue(object[key]);
      } else {
        this.redactObjectFieldsInPlace(object[key], key);
      }
    }
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

  private redactNullOrUndefined(): string {
    return this.redactedText;
  }

  private redactBoolean(value: boolean): string {
    return this.redactedText;
  }

  private redactFunction(value: Function): string {
    return this.redactedText;
  }

  private redactDate(value: Date): string {
    return this.redactedText;
  }

  private redactAny(value: boolean): string {
    return this.redactedText;
  }
}