import rfdc from 'rfdc';
import { FieldRedactorConfig } from './types';
import { ObjectRedactor } from './objectRedactor';
import { PrimitiveRedactor } from './primitiveRedactor';
import { SecretManager } from './secretManager';
import { CustomObjectManager } from './customObjectManager';
import { FieldRedactorError, FieldRedactorValidationError } from './errors';

/**
 * FieldRedactor is a highly customizable JSON object field redactor. It conditionally redacts fields based on
 * the secrets, deepSecrets, fullSecrets, and custom objects provided in the configuration. Refer to the README.md
 * for more details.
 */
export class FieldRedactor {
  private deepCopy = rfdc({ proto: true, circles: true });
  private readonly objectRedactor: ObjectRedactor;
  constructor(config?: FieldRedactorConfig) {
    const { redactor, secretKeys, deepSecretKeys, fullSecretKeys, customObjects } = config || {};

    const ignoreNullOrUndefined =
      typeof config?.ignoreNullOrUndefined === 'boolean' ? config.ignoreNullOrUndefined : true;
    const ignoreBooleans = typeof config?.ignoreBooleans === 'boolean' ? config.ignoreBooleans : true;

    const primitiveRedactor = new PrimitiveRedactor({
      ignoreBooleans,
      ignoreNullOrUndefined,
      redactor
    });

    const secretManager = new SecretManager({
      secretKeys,
      deepSecretKeys,
      fullSecretKeys
    });

    const customObjectChecker = new CustomObjectManager(customObjects);

    this.objectRedactor = new ObjectRedactor(primitiveRedactor, secretManager, customObjectChecker);
  }

  /**
   * Conditionally redacts fields in the JSON object based on the configuration provided in the constructor and returns the
   * redacted result.
   * @param value The JSON value to redact.
   * @returns The redacted JSON object.
   */
  public async redact(value: any): Promise<any> {
    const copy = this.deepCopy(value);
    return this.redactInPlace(copy);
  }

  /**
   * Conditionally redacts fields in the JSON object in place based on the configuration provided in the constructor.
   * @param value The JSON value to redact in place.
   */
  public async redactInPlace(value: any): Promise<void> {
    this.validateInput(value);
    try {
      return this.objectRedactor.redactInPlace(value);
    } catch (e: any) {
      throw new FieldRedactorError(e.message);
    }
  }

  private validateInput(value: any) {
    if (!value || typeof value !== 'object' || value instanceof Date) {
      throw new FieldRedactorValidationError('Input value must be a JSON object');
    }
  }
}
