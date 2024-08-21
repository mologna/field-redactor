import { Strategy } from '../strategy';

export class RedactionStrategy implements Strategy {
  constructor(private readonly redactionText: string = 'REDACTED') {}

  public execute(value: string): string {
    return this.redactionText;
  }

  public getName(): string {
    return 'redaction';
  }
}
