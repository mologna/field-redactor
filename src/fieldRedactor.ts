import rfdc from 'rfdc';
import { FieldRedactorConfig } from './types';
import { ObjectRedactor } from './objectRedactor';

export class FieldRedactor {
  private deepCopy = rfdc({ proto: true, circles: true });
  private readonly objectRedactor: ObjectRedactor;

  constructor(config?: FieldRedactorConfig) {
    this.objectRedactor = new ObjectRedactor(config);
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
