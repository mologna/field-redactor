import rfdc from 'rfdc';
import { FieldRedactorConfig, JsonArray, JsonObject, RedactableInput, TraversableJson } from './types';
import { ObjectRedactor } from './objectRedactor';
import { PrimitiveRedactor } from './primitiveRedactor';
import { SecretManager } from './secretManager';
import { CustomObjectManager } from './customObjectManager';
import { FieldRedactorConfigurationError, FieldRedactorError } from './errors';

const hasNonEmptyArray = <T>(value: T[] | undefined): value is T[] => value !== undefined && value.length > 0;

const hasExplicitRedactionRules = (config: FieldRedactorConfig): boolean =>
  hasNonEmptyArray(config.secretKeys) ||
  hasNonEmptyArray(config.deepSecretKeys) ||
  hasNonEmptyArray(config.fullSecretKeys) ||
  hasNonEmptyArray(config.deleteSecretKeys) ||
  hasNonEmptyArray(config.customObjects);

/**
 * FieldRedactor is a highly customizable JSON object field redactor. It conditionally redacts fields based on
 * the secrets, deepSecrets, fullSecrets, and custom objects provided in the configuration. Refer to the README.md
 * for more details.
 *
 * Defaults: `ignoreNullOrUndefined` is `true`, `ignoreBooleans` is `false`, `cloneInput` is `true`.
 */
export class FieldRedactor {
  private readonly deepCopy = rfdc({ proto: true, circles: true });
  private readonly objectRedactor: ObjectRedactor;
  private readonly usesAsyncRedactor: boolean;
  private readonly cloneInput: boolean;

  constructor(config?: FieldRedactorConfig) {
    const { redactor, syncRedactor, secretKeys, deepSecretKeys, fullSecretKeys, deleteSecretKeys, customObjects } =
      config || {};

    const ignoreNullOrUndefined =
      typeof config?.ignoreNullOrUndefined === 'boolean' ? config.ignoreNullOrUndefined : true;
    const ignoreBooleans = typeof config?.ignoreBooleans === 'boolean' ? config.ignoreBooleans : false;
    this.cloneInput = config?.cloneInput !== false;

    const primitiveRedactor = new PrimitiveRedactor({
      ignoreBooleans,
      ignoreNullOrUndefined,
      redactor,
      syncRedactor
    });

    this.usesAsyncRedactor = primitiveRedactor.usesAsyncRedactor();

    const secretManager = new SecretManager({
      secretKeys,
      deepSecretKeys,
      fullSecretKeys,
      deleteSecretKeys
    });

    const customObjectChecker = new CustomObjectManager(customObjects);

    this.objectRedactor = new ObjectRedactor(primitiveRedactor, secretManager, customObjectChecker);
  }

  /**
   * Creates a FieldRedactor that requires at least one explicit redaction rule: Shallow (`secretKeys`),
   * Deep (`deepSecretKeys`), Opaque (`fullSecretKeys`), Remove (`deleteSecretKeys`), or Schema (`customObjects`).
   * Unlike `new FieldRedactor()`, omitting all rules does not default to redacting every value.
   */
  public static createSafe(config: FieldRedactorConfig): FieldRedactor {
    if (!hasExplicitRedactionRules(config)) {
      throw new FieldRedactorConfigurationError(
        'FieldRedactor.createSafe() requires at least one non-empty secretKeys, deepSecretKeys, fullSecretKeys, deleteSecretKeys, or customObjects entry. Without explicit rules, new FieldRedactor() redacts all values by default.'
      );
    }

    return new FieldRedactor(config);
  }

  /**
   * Conditionally redacts fields in the JSON object based on the configuration provided in the constructor and returns the
   * redacted result.
   * If the value is a primitive, undefined, or date, returns the value as-is.
   * @param value The JSON value to redact. If primitive it will be resolved as-is.
   * @returns The redacted JSON object.
   */
  public async redact<T extends RedactableInput>(value: T): Promise<T> {
    if (this.isPrimitiveOrUndefined(value)) {
      return value;
    }

    if (!this.cloneInput) {
      await this.redactInPlace(value);
      return value;
    }

    if (!this.usesAsyncRedactor) {
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

    if (!this.cloneInput) {
      this.redactInPlaceSync(value);
      return value;
    }

    return this.objectRedactor.redactCopyOnWrite(value as TraversableJson) as T;
  }

  /**
   * Conditionally redacts fields in the JSON object in place based on the configuration provided in the constructor.
   * If the value is a primitive, undefined, or date, returns the value as-is.
   * @param value The JSON value to redact in place. If primitive it will be resolved as-is.
   */
  public async redactInPlace<T extends RedactableInput>(value: T): Promise<void> {
    if (!this.usesAsyncRedactor) {
      this.redactInPlaceSync(value);
      return;
    }

    await this.runTraversableRedactionAsync(value, async () => {
      await this.objectRedactor.redactInPlace(value as TraversableJson);
    });
  }

  /**
   * Synchronously redacts fields in the JSON object in place without per-field Promise overhead.
   * Requires a `syncRedactor` or the default redactor; throws when only an async `redactor` is configured.
   */
  public redactInPlaceSync<T extends RedactableInput>(value: T): void {
    if (this.usesAsyncRedactor) {
      throw new FieldRedactorError('redactInPlaceSync requires syncRedactor configuration or the default redactor');
    }

    this.runTraversableRedactionSync(value, () => this.objectRedactor.redactInPlaceSync(value as TraversableJson));
  }

  private runTraversableRedactionSync<T extends RedactableInput>(value: T, redact: () => void): void {
    if (this.isPrimitiveOrUndefined(value)) {
      return;
    }

    try {
      redact();
    } catch (e: unknown) {
      throw this.toFieldRedactorError(e);
    }
  }

  private async runTraversableRedactionAsync<T extends RedactableInput>(
    value: T,
    redact: () => Promise<void>
  ): Promise<void> {
    if (this.isPrimitiveOrUndefined(value)) {
      return;
    }

    try {
      await redact();
    } catch (e: unknown) {
      throw this.toFieldRedactorError(e);
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
