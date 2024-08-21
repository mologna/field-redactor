import { Formatter } from '../formatter';
import { Strategy, HASH_STRATEGIES, REDACTION_STRATEGY } from '../strategies';
import { Obfuscator } from '../obfuscator/obfuscator';
import { ObfuscatorImpl } from '../obfuscator/impl/obfuscatorImpl';
import { FormatterBuilder } from './formatterBuilder';
import { StrategyBuilder } from './strategyBuilder';
import { BinaryToTextEncoding } from 'crypto';

export class ObfuscatorBuilder {
  private strategy?: Strategy;
  private strategyBuilder = new StrategyBuilder();

  private shouldUseFormatter: boolean = false;
  private formatter?: Formatter = undefined;
  private formatterBuilder = new FormatterBuilder();

  private obfuscateBooleans: boolean = false;
  private obfuscateDates: boolean = false;
  private obfuscateFuncs: boolean = false;

  constructor() {}
  public useCustomStrategy(strategy: Strategy): ObfuscatorBuilder {
    this.strategy = strategy;
    return this;
  }

  public useStrategy(
    strategy: HASH_STRATEGIES,
    encoding?: BinaryToTextEncoding
  ): ObfuscatorBuilder;
  public useStrategy(
    strategy: REDACTION_STRATEGY,
    encoding?: string
  ): ObfuscatorBuilder;
  public useStrategy(
    strategy: HASH_STRATEGIES | REDACTION_STRATEGY,
    encoding?: string
  ): ObfuscatorBuilder {
    this.strategyBuilder.setStrategy(strategy);
    if (encoding) {
      this.strategyBuilder.setEncoding(encoding);
    }

    return this;
  }

  public useCustomFormatter(formatter: Formatter): ObfuscatorBuilder {
    this.formatter = formatter;
    return this;
  }

  public useFormat(): ObfuscatorBuilder;
  public useFormat(formatter: string): ObfuscatorBuilder;
  public useFormat(formatter?: string): ObfuscatorBuilder {
    this.shouldUseFormatter = true;
    if (formatter) {
      this.formatterBuilder.setFormatStrategy(formatter);
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
    const strategy = this.buildStrategy();
    const formatter = this.getFormatter(strategy);

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

  private buildStrategy(): Strategy {
    if (this.strategy) {
      return this.strategy;
    }

    return this.strategyBuilder.build();
  }

  private getFormatter(strategy: Strategy): Formatter | undefined {
    if (this.formatter) {
      return this.formatter;
    }

    if (!this.shouldUseFormatter) {
      return;
    }

    return this.formatterBuilder.setFormatStrategy(strategy.getName()).build();
  }
}
