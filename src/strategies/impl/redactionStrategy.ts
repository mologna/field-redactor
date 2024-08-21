import { Strategy } from '../strategy';

export class RedactionStrategy implements Strategy {
  public static DEFAULT_REDACTION_TEXT = 'REDACTED';
  constructor(
    private readonly redactionText: string = RedactionStrategy.DEFAULT_REDACTION_TEXT
  ) {}

  public execute(value: string): string {
    return this.redactionText;
  }

  public getName(): string {
    return 'redaction';
  }
}
