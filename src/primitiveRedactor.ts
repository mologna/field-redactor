import { PrimitiveRedactorConfig, RedactablePrimitive, RedactedPrimitive, Redactor, SyncRedactor } from './types';

/**
 * Redacts primitive values based on the configuration provided in the constructor. Uses the redactor
 * privded in the constructor to redact values, or a basic redactor which returns 'REDACTED' if no redactor
 * provided. Null and undefined values are ignored by default.
 */
export class PrimitiveRedactor {
  private static DEFAULT_REDACTED_TEXT = 'REDACTED';
  private ignoreBooleans: boolean;
  private ignoreNullOrUndefined: boolean;
  private readonly useAsyncRedactor: boolean;
  private readonly syncRedactor: SyncRedactor;
  private readonly asyncRedactor?: Redactor;

  /**
   * Creates a PrimitiveRedactor with the specified configuration.
   * @param config The PrimitiveRedactor configuration which specifies the redactor to use, whether to
   * ignore booleans, and whether to ignore null or undefined values.
   */
  constructor(config: PrimitiveRedactorConfig) {
    this.ignoreBooleans = config.ignoreBooleans;
    this.ignoreNullOrUndefined = config.ignoreNullOrUndefined;
    this.useAsyncRedactor = !!config.redactor && !config.syncRedactor;

    if (config.syncRedactor) {
      this.syncRedactor = config.syncRedactor;
    } else if (!config.redactor) {
      this.syncRedactor = () => PrimitiveRedactor.DEFAULT_REDACTED_TEXT;
    } else {
      this.syncRedactor = () => {
        throw new Error('Sync redaction is not available without syncRedactor configuration');
      };
    }

    if (config.redactor) {
      this.asyncRedactor = config.redactor;
    }
  }

  public usesAsyncRedactor(): boolean {
    return this.useAsyncRedactor;
  }

  /**
   * Redacts the primitive value based on the configuration provided in the constructor.
   * @param value The value to redact.
   * @returns The redacted value.
   */
  public async redactValue(value: RedactablePrimitive): Promise<RedactedPrimitive> {
    if (!this.useAsyncRedactor) {
      return this.redactValueSync(value);
    }

    if (typeof value === 'boolean') {
      return this.redactBoolean(value);
    }

    if (value === null || value === undefined) {
      return this.redactNullOrUndefinedValue(value);
    }

    if (value === '' || value === 0) {
      return this.ignoreNullOrUndefined ? value : this.asyncRedactor!(value);
    }

    return this.redactAny(value);
  }

  /**
   * Synchronously redacts a primitive value without Promise allocation.
   */
  public redactValueSync(value: RedactablePrimitive): RedactedPrimitive {
    if (typeof value === 'boolean') {
      return this.redactBooleanSync(value);
    }

    if (value === null || value === undefined) {
      return this.redactNullOrUndefinedValueSync(value);
    }

    if (value === '' || value === 0) {
      return this.ignoreNullOrUndefined ? value : this.syncRedactor(value);
    }

    return this.syncRedactor(value);
  }

  private async redactNullOrUndefinedValue(value: null | undefined): Promise<null | undefined | string> {
    if (this.ignoreNullOrUndefined) {
      return value;
    }
    return this.asyncRedactor!(value);
  }

  private redactNullOrUndefinedValueSync(value: null | undefined): null | undefined | string {
    if (this.ignoreNullOrUndefined) {
      return value;
    }
    return this.syncRedactor(value);
  }

  private async redactBoolean(value: boolean): Promise<boolean | string> {
    return this.ignoreBooleans ? value : this.asyncRedactor!(value);
  }

  private redactBooleanSync(value: boolean): boolean | string {
    return this.ignoreBooleans ? value : this.syncRedactor(value);
  }

  private async redactAny(value: string | number): Promise<string> {
    return this.asyncRedactor!(value);
  }
}
