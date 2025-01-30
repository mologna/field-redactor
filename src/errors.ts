/**
 * Top-Level Field Redactor error thrown when there is an error redacting a JSON object.
 */
export class FieldRedactorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FieldRedactorError';
  }
}

/**
 * Error thrown when there is a Configuration issue with the FieldRedactor, such as two
 * Custom Objects with identical keys.
 */
export class FieldRedactorConfigurationError extends FieldRedactorError {
  constructor(message: string) {
    super(message);
    this.name = 'FieldRedactorConfigurationError';
  }
}
