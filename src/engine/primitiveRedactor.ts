import {
  PrimitiveRedactorConfig,
  RedactablePrimitive,
  RedactedPrimitive,
  Redactor,
  RedactorContext,
  RedactorInput,
  SyncRedactor
} from '../types';
import { isAsyncOnlyBinding, RedactorBinding } from '../rules/redactorBinding';

const EMPTY_CONTEXT: RedactorContext = { key: '', path: '' };

/**
 * Redacts primitive values based on the configuration provided in the constructor. Uses the redactor
 * provided in the constructor to redact values, or a basic redactor which returns 'REDACTED' if no redactor
 * provided. Null and undefined values are ignored by default.
 *
 * Non-string scalars selected for redaction (numbers, and booleans when not ignored) are coerced with
 * `String(...)` before the custom redactor runs so string-only redactors still mask numeric PII.
 */
export type PrimitiveRedactorOptions = PrimitiveRedactorConfig & {
  /** Transforms attached to key and path rules. An async transform makes `redact()` walk asynchronously. */
  bindings?: RedactorBinding[];
};

export class PrimitiveRedactor {
  private static DEFAULT_REDACTED_TEXT = 'REDACTED';
  private readonly ignoreBooleans: boolean;
  private readonly ignoreNullOrUndefined: boolean;
  /** True when `redact()` must walk asynchronously (global async-only, or any binding defines `redactor`). */
  private readonly needsAsyncTraversal: boolean;
  /** False when a sync walk can throw because a redactor is async-only. */
  private readonly syncRedactionAllowed: boolean;
  private readonly globalAsyncOnly: boolean;
  private readonly syncRedactor: SyncRedactor;
  private readonly asyncRedactor?: Redactor;

  /**
   * Creates a PrimitiveRedactor with the specified configuration.
   * @param config The PrimitiveRedactor configuration which specifies the redactor to use, whether to
   * ignore booleans, and whether to ignore null or undefined values.
   */
  constructor(config: PrimitiveRedactorOptions) {
    const bindings = config.bindings ?? [];
    this.ignoreBooleans = config.ignoreBooleans;
    this.ignoreNullOrUndefined = config.ignoreNullOrUndefined;
    this.globalAsyncOnly = !!config.redactor && !config.syncRedactor;
    this.needsAsyncTraversal = this.globalAsyncOnly || bindings.some((binding) => !!binding.redactor);
    this.syncRedactionAllowed = !this.globalAsyncOnly && !bindings.some((binding) => isAsyncOnlyBinding(binding));
    this.syncRedactor =
      config.syncRedactor ??
      (config.redactor
        ? () => {
            throw new Error('Sync redaction is not available without syncRedactor configuration');
          }
        : () => PrimitiveRedactor.DEFAULT_REDACTED_TEXT);

    if (config.redactor) {
      this.asyncRedactor = config.redactor;
    }
  }

  /** True when `redact()` should use the async walk. A binding with both functions counts. */
  public usesAsyncRedactor(): boolean {
    return this.needsAsyncTraversal;
  }

  /** False when a sync walk can throw because the global redactor or a field rule is async-only. */
  public allowsSyncRedaction(): boolean {
    return this.syncRedactionAllowed;
  }

  /**
   * Redacts the primitive value based on the configuration provided in the constructor.
   * @param value The value to redact.
   * @returns The redacted value.
   */
  public async redactValue(
    value: RedactablePrimitive,
    binding?: RedactorBinding,
    context?: RedactorContext
  ): Promise<RedactedPrimitive> {
    if (!this.needsAsyncTraversal) {
      return this.redactValueSync(value, binding, context);
    }

    return this.redactWith(value, this.selectRedactor(binding, context, false)) as Promise<RedactedPrimitive>;
  }

  /**
   * Synchronously redacts a primitive value without Promise allocation.
   * A binding that defines both functions uses `syncRedactor` here and `redactor` on the async path.
   */
  public redactValueSync(
    value: RedactablePrimitive,
    binding?: RedactorBinding,
    context?: RedactorContext
  ): RedactedPrimitive {
    return this.redactWith(value, this.selectRedactor(binding, context, true)) as RedactedPrimitive;
  }

  /**
   * On the async path, a binding's `redactor` wins, then its `syncRedactor`, then the global function.
   * On the sync path, a binding's `syncRedactor` wins. The global pair still prefers `syncRedactor`
   * for both paths when both are set, matching the historical default.
   */
  private selectRedactor(
    binding: RedactorBinding | undefined,
    context: RedactorContext | undefined,
    sync: boolean
  ): (input: RedactorInput) => RedactedPrimitive | Promise<RedactedPrimitive> {
    const ctx = context ?? EMPTY_CONTEXT;

    if (!sync && binding?.redactor) {
      return (input) => binding.redactor!(input, ctx);
    }

    if (binding?.syncRedactor) {
      return (input) => binding.syncRedactor!(input, ctx);
    }

    if (!sync && this.globalAsyncOnly && this.asyncRedactor) {
      return (input) => this.asyncRedactor!(input, ctx);
    }

    if (sync && isAsyncOnlyBinding(binding)) {
      throw new Error('Sync redaction is not available without syncRedactor configuration');
    }

    return (input) => this.syncRedactor(input, ctx);
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
