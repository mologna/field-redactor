import { FieldRedactorConfigurationError, FieldRedactorError } from '../errors';
import { buildFieldRedactorDeps, FieldRedactorDeps } from './fieldRedactorDeps';
import {
  DryRunResult,
  FieldRedactorConfig,
  JsonArray,
  JsonObject,
  JsonValue,
  RedactableInput,
  TraversableJson
} from '../types';
import { buildDryRunReport, EMPTY_DRY_RUN_REPORT } from '../dryrun/dryRun';
import rfdc from 'rfdc';
import { hasExplicitRedactionRules, validateFieldRedactorConfig } from '../config/configValidator';

const EXPLICIT_RULES_REQUIRED_MESSAGE =
  'FieldRedactor requires at least one non-empty secretKeys, deepSecretKeys, opaqueSecretKeys, removeSecretKeys, customObjects, valuePatterns, or pathRules entry.';

/**
 * FieldRedactor is a highly customizable JSON object field redactor. It conditionally redacts fields based on
 * the secret key rules, path rules, value patterns, and custom object schemas in the configuration. Refer to the README.md
 * for more details.
 *
 * Defaults: `ignoreBooleans` is `false`, `ignoreNullOrUndefined` is `true`, `cloneInput` is `true`.
 * Construction requires at least one explicit redaction rule (same bar as {@link FieldRedactor.createSafe}).
 */
export class FieldRedactor {
  private readonly deepCopy = rfdc({ proto: true, circles: true });
  private readonly deps: FieldRedactorDeps;

  /** Non-fatal configuration warnings from the last construction (empty when `strict` threw). */
  public readonly configWarnings: readonly string[];

  constructor(config?: FieldRedactorConfig) {
    if (!hasExplicitRedactionRules(config)) {
      throw new FieldRedactorConfigurationError(EXPLICIT_RULES_REQUIRED_MESSAGE);
    }

    this.configWarnings = validateFieldRedactorConfig(config);
    for (const warning of this.configWarnings) {
      config?.onConfigWarning?.(warning);
    }

    this.deps = buildFieldRedactorDeps(config);
  }

  /**
   * Creates a FieldRedactor with the same explicit-rule requirement as the constructor.
   * Prefer this name when you want the “safe construction” intent to be obvious at the call site.
   */
  public static createSafe(config: FieldRedactorConfig): FieldRedactor {
    return new FieldRedactor(config);
  }

  /** Redacts a copy of the input and returns an audit report of affected paths without mutating the original. */
  public async dryRun<T extends RedactableInput>(value: T): Promise<DryRunResult<T>> {
    return this.runDryRun(value, (input) => this.redact(input));
  }

  /** Synchronous {@link FieldRedactor.dryRun} without per-field Promise overhead. */
  public dryRunSync<T extends RedactableInput>(value: T): DryRunResult<T> {
    if (this.isPrimitiveOrUndefined(value)) {
      return this.emptyDryRunResult(value);
    }

    const snapshot = this.deepCopy(value) as T;
    return this.toDryRunResult(snapshot, this.redactSync(value));
  }

  private runDryRun<T extends RedactableInput>(
    value: T,
    redact: (input: T) => T | Promise<T>
  ): DryRunResult<T> | Promise<DryRunResult<T>> {
    if (this.isPrimitiveOrUndefined(value)) {
      return this.emptyDryRunResult(value);
    }

    const snapshot = this.deepCopy(value) as T;
    const result = redact(value);
    if (result instanceof Promise) {
      return result.then((redacted) => this.toDryRunResult(snapshot, redacted));
    }

    return this.toDryRunResult(snapshot, result);
  }

  private emptyDryRunResult<T>(value: T): DryRunResult<T> {
    return { result: value, report: EMPTY_DRY_RUN_REPORT };
  }

  private toDryRunResult<T extends RedactableInput>(snapshot: T, result: T): DryRunResult<T> {
    return {
      result,
      report: buildDryRunReport(
        snapshot as JsonValue,
        result as JsonValue,
        this.deps.customObjectManager,
        this.deps.secretManager,
        this.deps.valuePatternMatcher,
        this.deps.pathRuleMatcher
      )
    };
  }

  /**
   * Conditionally redacts fields in the JSON object based on the configuration provided in the constructor and returns the
   * redacted result.
   * If the value is a primitive, undefined, or date, returns the value as-is.
   */
  public async redact<T extends RedactableInput>(value: T): Promise<T> {
    if (this.isPrimitiveOrUndefined(value)) {
      return value;
    }

    if (!this.deps.cloneInput) {
      await this.redactInPlace(value);
      return value;
    }

    if (!this.deps.usesAsyncRedactor) {
      return Promise.resolve(this.redactSync(value));
    }

    const copy = this.deepCopy(value) as T;
    await this.redactInPlace(copy);
    return copy;
  }

  /**
   * Synchronously redacts fields and returns a copy without per-field Promise overhead.
   * Uses copy-on-write structural sharing by default so only mutated branches are cloned.
   */
  public redactSync<T extends RedactableInput>(value: T): T {
    if (this.isPrimitiveOrUndefined(value)) {
      return value;
    }

    if (!this.deps.cloneInput) {
      this.redactInPlaceSync(value);
      return value;
    }

    return this.deps.traversal.redactCopyOnWrite(value as TraversableJson) as T;
  }

  /** Conditionally redacts fields in the JSON object in place based on the configuration provided in the constructor. */
  public async redactInPlace<T extends RedactableInput>(value: T): Promise<void> {
    if (!this.deps.usesAsyncRedactor) {
      this.redactInPlaceSync(value);
      return;
    }

    await this.runTraversableRedaction(value, () => this.deps.traversal.redactInPlaceAsync(value as TraversableJson));
  }

  /**
   * Synchronously redacts fields in the JSON object in place without per-field Promise overhead.
   * Requires a `syncRedactor` or the default redactor; throws when only an async `redactor` is configured.
   */
  public redactInPlaceSync<T extends RedactableInput>(value: T): void {
    if (this.deps.usesAsyncRedactor) {
      throw new FieldRedactorError('redactInPlaceSync requires syncRedactor configuration or the default redactor');
    }

    this.runTraversableRedaction(value, () => this.deps.traversal.redactInPlace(value as TraversableJson));
  }

  private runTraversableRedaction<T extends RedactableInput>(
    value: T,
    redact: () => unknown
  ): void | Promise<void> {
    if (this.isPrimitiveOrUndefined(value)) {
      return;
    }

    try {
      const result = redact();
      if (result instanceof Promise) {
        return result.catch((error: unknown) => {
          throw this.toFieldRedactorError(error);
        });
      }
    } catch (error: unknown) {
      throw this.toFieldRedactorError(error);
    }
  }

  private toFieldRedactorError(error: unknown): FieldRedactorError {
    const message = error instanceof Error ? error.message : String(error);
    return new FieldRedactorError(message);
  }

  private isPrimitiveOrUndefined(value: RedactableInput): value is Exclude<RedactableInput, JsonObject | JsonArray> {
    return !value || typeof value !== 'object' || value instanceof Date;
  }
}
