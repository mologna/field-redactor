import {
  PrimitiveRedactorConfig,
  RedactablePrimitive,
  RedactedPrimitive,
  Redactor,
  RedactorInput,
  SyncRedactor
} from '../types';

/**
 * Redacts primitive values based on the configuration provided in the constructor. Uses the redactor
 * provided in the constructor to redact values, or a basic redactor which returns 'REDACTED' if no redactor
 * provided. Null and undefined values are ignored by default.
 *
 * Non-string scalars selected for redaction (numbers, and booleans when not ignored) are coerced with
 * `String(...)` before the custom redactor runs so string-only redactors still mask numeric PII.
 */
export class PrimitiveRedactor {
  private static DEFAULT_REDACTED_TEXT = 'REDACTED';
  private readonly ignoreBooleans: boolean;
  private readonly ignoreNullOrUndefined: boolean;
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
    this.syncRedactor = config.syncRedactor ?? (config.redactor
      ? () => {
          throw new Error('Sync redaction is not available without syncRedactor configuration');
        }
      : () => PrimitiveRedactor.DEFAULT_REDACTED_TEXT);

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

    return this.redactWith(value, (input) => this.asyncRedactor!(input)) as Promise<RedactedPrimitive>;
  }

  /**
   * Synchronously redacts a primitive value without Promise allocation.
   */
  public redactValueSync(value: RedactablePrimitive): RedactedPrimitive {
    return this.redactWith(value, (input) => this.syncRedactor(input)) as RedactedPrimitive;
  }

  private redactWith(
    value: RedactablePrimitive,
    apply: (input: RedactorInput) => RedactedPrimitive | Promise<RedactedPrimitive>
  ): RedactedPrimitive | Promise<RedactedPrimitive> {
    if (typeof value === 'boolean') {
      return this.ignoreBooleans ? value : apply(this.toRedactorInput(value));
    }

    if (value === null || value === undefined) {
      return this.ignoreNullOrUndefined ? value : apply(value);
    }

    if (value === '' || value === 0) {
      return this.ignoreNullOrUndefined ? value : apply(this.toRedactorInput(value));
    }

    return apply(this.toRedactorInput(value));
  }

  /**
   * Coerce non-string scalars to strings before invoking a custom redactor.
   * Numbers (and booleans) otherwise pass through string-only redactors unchanged.
   * `null` / `undefined` are left as-is so redactors can special-case them.
   */
  private toRedactorInput(value: RedactablePrimitive): RedactorInput {
    if (typeof value === 'string' || value === null || value === undefined) {
      return value;
    }

    return String(value);
  }
}
