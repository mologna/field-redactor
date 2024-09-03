import { RedactionStrategyConfig } from '../../types/config';
import { TypeCheckers } from '../../utils/typeCheckers';
import { Strategy } from '../strategy';

export class RedactionStrategy implements Strategy {
  public static DEFAULT_REDACTION_TEXT = 'REDACTED';
  private readonly replacementText: string;
  constructor(config: RedactionStrategyConfig) {
    if (!TypeCheckers.isRedactionStrategyConfig(config)) {
      throw new Error('Invalid configuration provided for Redaction Strategy.');
    }
    const { replacementText } = config;
    this.replacementText = replacementText
      ? replacementText
      : RedactionStrategy.DEFAULT_REDACTION_TEXT;
  }

  public execute(value: string): string {
    return this.replacementText;
  }

  public getName(): string {
    return 'redaction';
  }
}
