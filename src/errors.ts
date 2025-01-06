export class FieldRedactorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FieldRedactorError';
  }
}

export class FieldRedactorConfigurationError extends FieldRedactorError {
  constructor(message: string) {
    super(message);
    this.name = 'FieldRedactorConfigurationError';
  }
}

export class FieldRedactorValidationError extends FieldRedactorError {
  constructor(message: string) {
    super(message);
    this.name = 'FieldRedactorValidationError';
  }
}
