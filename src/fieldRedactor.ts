import rfdc from 'rfdc';
import { FieldRedactorConfig } from './types';
import { ObjectRedactor } from './objectRedactor';
import { PrimitiveRedactor } from './primitiveRedactor';
import { SecretManager } from './secretManager';
import { CustomObjectChecker } from './customObjectChecker';

export class FieldRedactor {
  private deepCopy = rfdc({ proto: true, circles: true });
  private readonly objectRedactor: ObjectRedactor;

  constructor(config?: FieldRedactorConfig) {
    const {
      ignoreBooleans,
      ignoreDates,
      ignoreNullOrUndefined,
      redactor,
      secretKeys,
      deepSecretKeys,
      fullSecretKeys,
      customObjects
    } = config || {};

    const primitiveRedactor = new PrimitiveRedactor({
      ignoreBooleans,
      ignoreDates,
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
    this.validateInput(value);
    const copy = this.deepCopy(value);
    return this.objectRedactor.redactInPlace(copy);
  }

  /**
   * Redacts the fields of a JSON object in place based on the configuration provided.
   * @param value The JSON value to redact in place.
   */
  public async redactInPlace(value: any): Promise<void> {
    this.validateInput(value);
    return this.objectRedactor.redactInPlace(value);
  }

  private validateInput(value: any) {
    if (!value || typeof value !== 'object' || value instanceof Date) {
      throw new Error('Input value must be a JSON object');
    }
  }
}
