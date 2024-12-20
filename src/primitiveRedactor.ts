import { PrimitiveRedactorConfig, Redactor } from "./types";


export class PrimitiveRedactor {
  private static DEFAULT_REDACTED_TEXT = 'REDACTED';
  private ignoreDates: boolean;
  private ignoreBooleans: boolean;
  private ignoreNullOrUndefined: boolean;
  private redactor: Redactor = (val: any) => Promise.resolve(PrimitiveRedactor.DEFAULT_REDACTED_TEXT)
  constructor(config: PrimitiveRedactorConfig) {
    if (config.redactor) {
      this.redactor = config.redactor;
    }
    this.ignoreDates = !!config?.ignoreDates;
    this.ignoreBooleans = !!config?.ignoreBooleans;
    if (typeof config?.ignoreNullOrUndefined === 'boolean') {
      this.ignoreNullOrUndefined = config.ignoreNullOrUndefined;
    } else {
      this.ignoreNullOrUndefined = true;
    }
    console.log("Ignore null or undefined is", this.ignoreNullOrUndefined);
  }

  public async redactValue(value: any): Promise<any> {
    if (!value) {
      return this.redactNullOrUndefinedValue(value);
    } else if (typeof value === 'boolean') {
      return this.redactBoolean(value);
    } else if (value instanceof Date) {
      return this.redactDate(value);
    }

    return this.redactAny(value);
  }

  private async redactNullOrUndefinedValue(value: null | undefined): Promise<null | undefined | string> {
    if (this.ignoreNullOrUndefined) {
      const result = await Promise.resolve(value);
      return result;
    }
    return this.ignoreNullOrUndefined ? Promise.resolve(value) : this.redactor(value);
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