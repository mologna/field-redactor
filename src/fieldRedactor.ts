import rfdc from 'rfdc';
import { FieldRedactorConfig } from './types';
import { ObjectRedactor } from './objectRedactor';
import { PrimitiveRedactor } from './primitiveRedactor';
import { SecretManager } from './secretManager';
import { CustomObjectChecker } from './customObjectChecker';
import { FieldRedactorError, FieldRedactorValidationError } from './errors';

export class FieldRedactor {
  private deepCopy = rfdc({ proto: true, circles: true });
  private readonly objectRedactor: ObjectRedactor;
  constructor(config?: FieldRedactorConfig) {
    const {
      ignoreBooleans,
      ignoreNullOrUndefined,
      redactor,
      secretKeys,
      deepSecretKeys,
      fullSecretKeys,
      customObjects
    } = config || {};

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

    const customObjectChecker = new CustomObjectChecker(customObjects);

    this.objectRedactor = new ObjectRedactor(primitiveRedactor, secretManager, customObjectChecker);
  }

  /**
   * Redacts the fields of a JSON object based on the configuration provided.
   * @param value The JSON value to redact
   * @returns The redacted JSON object.
   */
  public async redact(value: any): Promise<any> {
    const copy = this.deepCopy(value);
    return this.redactInPlace(copy);
  }

  /**
   * Redacts the fields of a JSON object in place based on the configuration provided.
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
