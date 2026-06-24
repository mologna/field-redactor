import rfdc from 'rfdc';
import { FieldRedactorConfig, JsonArray, JsonObject, RedactableInput, TraversableJson } from './types';
import { ObjectRedactor } from './objectRedactor';
import { PrimitiveRedactor } from './primitiveRedactor';
import { SecretManager } from './secretManager';
import { CustomObjectManager } from './customObjectManager';
import { FieldRedactorError } from './errors';

/**
 * FieldRedactor is a highly customizable JSON object field redactor. It conditionally redacts fields based on
 * the secrets, deepSecrets, fullSecrets, and custom objects provided in the configuration. Refer to the README.md
 * for more details.
 *
 * Defaults: `ignoreNullOrUndefined` is `true`, `ignoreBooleans` is `false`.
 */
export class FieldRedactor {
  private deepCopy = rfdc({ proto: true, circles: true });
  private readonly objectRedactor: ObjectRedactor;
  constructor(config?: FieldRedactorConfig) {
    const { redactor, secretKeys, deepSecretKeys, fullSecretKeys, deleteSecretKeys, customObjects } = config || {};

    const ignoreNullOrUndefined =
      typeof config?.ignoreNullOrUndefined === 'boolean' ? config.ignoreNullOrUndefined : true;
    const ignoreBooleans = typeof config?.ignoreBooleans === 'boolean' ? config.ignoreBooleans : false;

    const primitiveRedactor = new PrimitiveRedactor({
      ignoreBooleans,
      ignoreNullOrUndefined,
      redactor
    });

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
   * Conditionally redacts fields in the JSON object based on the configuration provided in the constructor and returns the
   * redacted result.
   * If the value is a primitive, undefined, or date, returns the value as-is.
   * @param value The JSON value to redact. If primitive it will be resolved as-is.
   * @returns The redacted JSON object.
   */
  public async redact<T extends RedactableInput>(value: T): Promise<T> {
    const copy = this.deepCopy(value) as T;
    await this.redactInPlace(copy);
    return copy;
  }

  /**
   * Conditionally redacts fields in the JSON object in place based on the configuration provided in the constructor.
   * If the value is a primitive, undefined, or date, returns the value as-is.
   * @param value The JSON value to redact in place. If primitive it will be resolved as-is.
   */
  public async redactInPlace<T extends RedactableInput>(value: T): Promise<void> {
    if (this.isPrimitiveOrUndefined(value)) {
      return;
    }

    try {
      await this.objectRedactor.redactInPlace(value as TraversableJson);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      throw new FieldRedactorError(message);
    }
  }

  private isPrimitiveOrUndefined(value: RedactableInput): value is Exclude<RedactableInput, JsonObject | JsonArray> {
    return !value || typeof value !== 'object' || value instanceof Date;
  }
}
