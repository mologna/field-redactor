import { Formatter, FormatterImpl } from '../formatter';
import { Strategy, STRATEGIES, HashStrategy } from '../strategies';
import { DataObfuscator } from './dataObfuscator';
import { DataObfuscatorImpl } from './impl/dataObfuscatorImpl';

export class DataObfuscatorBuilder {
  private strategy?: Strategy | STRATEGIES = undefined;
  private formatter?: Formatter | string = undefined;
  private obfuscateBooleans: boolean = false;
  private obfuscateDates: boolean = false;
  private obfuscateFuncs: boolean = false;

  constructor() {}

  public setStrategy(strategy: STRATEGIES | Strategy): DataObfuscatorBuilder {
    this.strategy = strategy;
    return this;
  }

  public setFormat(format: string | Formatter): DataObfuscatorBuilder {
    this.formatter = format;

    return this;
  }

  public setObfuscateBooleans(value: boolean): DataObfuscatorBuilder {
    this.obfuscateBooleans = value;
    return this;
  }

  public setObfuscateDates(value: boolean): DataObfuscatorBuilder {
    this.obfuscateDates = value;
    return this;
  }

  public setObfuscateFuncs(value: boolean): DataObfuscatorBuilder {
    this.obfuscateFuncs = value;
    return this;
  }

  public build(): DataObfuscator {
    if (!this.strategy) {
      throw new Error('Must set strategy before building.');
    }
    const strategy = this.getStrategy(this.strategy);
    const formatter = this.formatter
      ? this.getFormatter(this.formatter, strategy)
      : undefined;

    const options = {
      values: {
        dates: this.obfuscateDates,
        functions: this.obfuscateFuncs,
        booleans: this.obfuscateBooleans
      },
      formatter
    };

    return new DataObfuscatorImpl(strategy, options);
  }

  private getFormatter(
    format: string | Formatter,
    strategy: Strategy
  ): Formatter {
    if (typeof format === 'string') {
      return new FormatterImpl(format, strategy.getName());
    }

    return format;
  }

  private getStrategy(strategy: STRATEGIES | Strategy): Strategy {
    if (this.instanceOfStrategy(strategy)) {
      return strategy;
    } else {
      return this.internalStrategyFactory(strategy);
    }
  }

  private instanceOfStrategy(object: any): object is Strategy {
    return (
      typeof object.execute === 'function' &&
      typeof object.getName === 'function'
    );
  }

  private internalStrategyFactory(strategy: STRATEGIES): Strategy {
    switch (strategy) {
      default: {
        return new HashStrategy('md5', 'hex');
      }
    }
  }
}
