import {
  HashStrategy,
  RedactionStrategy,
  Strategy
} from '../strategies';
import { BinaryToTextEncoding, HASH_STRATEGIES, isHashStrategy, isRedactionStrategy, isBinaryToTextEncoding, REDACTION_STRATEGY } from '../types';

export class StrategyBuilder {
  private strategy: HASH_STRATEGIES | REDACTION_STRATEGY = 'redaction';
  private encoding?: string;
  public DEFAULT_HASH_ENCODING: BinaryToTextEncoding = 'hex';

  public setStrategy(strategy: HASH_STRATEGIES | REDACTION_STRATEGY): StrategyBuilder {
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
