import { BinaryToTextEncoding } from 'crypto';
import {
  HASH_STRATEGIES,
  HashStrategy,
  isHashStrategy,
  isRedactionStrategy,
  RedactionStrategy,
  STRATEGIES,
  Strategy
} from '../strategies';
import { isBinaryToTextEncoding } from '../strategies/encodings';

export class StrategyBuilder {
  private strategy: STRATEGIES = 'redaction';
  private encoding?: string;
  public DEFAULT_HASH_ENCODING: BinaryToTextEncoding = 'hex';

  public setStrategy(strategy: STRATEGIES): StrategyBuilder {
    this.strategy = strategy;
    return this;
  }

  public setEncoding(encoding: string): StrategyBuilder {
    this.encoding = encoding;
    return this;
  }

  public build(): Strategy {
    if (isRedactionStrategy(this.strategy)) {
      return this.buildRedactionStrategy();
    }

    if (isHashStrategy(this.strategy)) {
      return this.buildHashStrategy(this.strategy);
    }

    throw new Error('Unknown strategy specified.');
  }

  private buildRedactionStrategy(): Strategy {
    const encoding = this.encoding
      ? this.encoding
      : RedactionStrategy.DEFAULT_REDACTION_TEXT;
    return new RedactionStrategy(encoding);
  }

  private buildHashStrategy(strategy: HASH_STRATEGIES): Strategy {
    const encoding = this.encoding
      ? this.encoding
      : HashStrategy.DEFAULT_HASH_ENCODING;
    if (!isBinaryToTextEncoding(encoding)) {
      throw new Error('Invalid encoding supplied for hash strategy.');
    }

    return new HashStrategy(strategy, encoding);
  }
}
