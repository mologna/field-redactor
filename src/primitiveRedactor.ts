import { PrimitiveRedactorConfig, Redactor } from './types';

/**
 * Redacts primitive values based on the configuration provided in the constructor. Uses the redactor
 * privded in the constructor to redact values, or a basic redactor which returns 'REDACTED' if no redactor
 * provided. Null and undefined values are ignored by default.
 */
export class PrimitiveRedactor {
  private static DEFAULT_REDACTED_TEXT = 'REDACTED';
  private ignoreBooleans: boolean;
  private ignoreNullOrUndefined: boolean;
  private redactor: Redactor = (val: any) => Promise.resolve(PrimitiveRedactor.DEFAULT_REDACTED_TEXT);

  /**
   * Creates a PrimitiveRedactor with the specified configuration.
   * @param config The PrimitiveRedactor configuration which specifies the redactor to use, whether to
   * ignore booleans, and whether to ignore null or undefined values.
   */
  constructor(config: PrimitiveRedactorConfig) {
    if (config.redactor) {
      this.redactor = config.redactor;
    }
    this.ignoreBooleans = config.ignoreBooleans;
    this.ignoreNullOrUndefined = config.ignoreNullOrUndefined;
  }

  /**
   * Redacts the primitive value based on the configuration provided in the constructor.
   * @param value The value to redact.
   * @returns The redacted value.
   */
  public async redactValue(value: any): Promise<any> {
    if (typeof value === 'boolean') {
      return this.redactBoolean(value);
    } else if (!value) {
      return this.redactNullOrUndefinedValue(value);
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

  private async redactAny(value: any): Promise<string> {
    return this.redactor(value);
  }
}
