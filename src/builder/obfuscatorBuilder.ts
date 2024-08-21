import { Formatter } from '../formatter';
import { Strategy, HASH_STRATEGIES, HashStrategy } from '../strategies';
import { Obfuscator } from '../obfuscator/obfuscator';
import { ObfuscatorImpl } from '../obfuscator/impl/obfuscatorImpl';
import { FormatterBuilder } from './formatterBuilder';

export class ObfuscatorBuilder {
  private strategy?: Strategy | HASH_STRATEGIES = undefined;
  private shouldUseFormatter: boolean = false;
  private formatter?: Formatter = undefined;
  private formatterBuilder = new FormatterBuilder();
  private obfuscateBooleans: boolean = false;
  private obfuscateDates: boolean = false;
  private obfuscateFuncs: boolean = false;

  constructor() {}

  public setStrategy(strategy: HASH_STRATEGIES | Strategy): ObfuscatorBuilder {
    this.strategy = strategy;
    return this;
  }

  public useFormat(): ObfuscatorBuilder
  public useFormat(formatter: string): ObfuscatorBuilder
  public useFormat(formatter: Formatter): ObfuscatorBuilder
  public useFormat(formatter?: string | Formatter): ObfuscatorBuilder {
    this.shouldUseFormatter = true;
    if (typeof formatter === 'string') {
      this.formatterBuilder.setFormatStrategy(formatter);
    } else if (!!formatter) {
      this.formatter = formatter;
    }

    return this;
  }

  public setObfuscateBooleans(value: boolean): ObfuscatorBuilder {
    this.obfuscateBooleans = value;
    return this;
  }

  public setObfuscateDates(value: boolean): ObfuscatorBuilder {
    this.obfuscateDates = value;
    return this;
  }

  public setObfuscateFuncs(value: boolean): ObfuscatorBuilder {
    this.obfuscateFuncs = value;
    return this;
  }

  public build(): Obfuscator {
    if (!this.strategy) {
      throw new Error('Must set strategy before building.');
    }
    const strategy = this.getStrategy(this.strategy);
    const formatter = this.buildFormatter(strategy);

    const options = {
      values: {
        dates: this.obfuscateDates,
        functions: this.obfuscateFuncs,
        booleans: this.obfuscateBooleans
      },
      formatter
    };

    return new ObfuscatorImpl(strategy, options);
  }

  private buildFormatter(strategy: Strategy): Formatter | undefined {
    if (!this.shouldUseFormatter) {
      return;
    } else if (this.formatter) {
      return this.formatter;
    }

    return this.formatterBuilder.setFormatStrategy(strategy.getName()).build();
  }

  private getStrategy(strategy: HASH_STRATEGIES | Strategy): Strategy {
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

  private internalStrategyFactory(strategy: HASH_STRATEGIES): Strategy {
    switch (strategy) {
      default: {
        return new HashStrategy(strategy, 'hex');
      }
    }
  }
}
