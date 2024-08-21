import { Formatter } from '../formatter';
import { Strategy, STRATEGIES } from '../strategies';
import { Obfuscator } from '../obfuscator/obfuscator';
import { ObfuscatorImpl } from '../obfuscator/impl/obfuscatorImpl';
import { FormatterBuilder } from './formatterBuilder';
import { StrategyBuilder } from './strategyBuilder';

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
  public useStrategy(strategy: STRATEGIES): ObfuscatorBuilder;
  public useStrategy(strategy: Strategy): ObfuscatorBuilder;
  public useStrategy(strategy: STRATEGIES | Strategy): ObfuscatorBuilder {
    if (this.instanceOfStrategy(strategy)) {
      this.strategy = strategy;
    } else {
      this.strategyBuilder.setStrategy(strategy);
    }

    return this;
  }

  public useFormat(): ObfuscatorBuilder;
  public useFormat(formatter: string): ObfuscatorBuilder;
  public useFormat(formatter: Formatter): ObfuscatorBuilder;
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
    if (!this.shouldUseFormatter) {
      return;
    } else if (this.formatter) {
      return this.formatter;
    }

    return this.formatterBuilder.setFormatStrategy(strategy.getName()).build();
  }

  private instanceOfStrategy(object: any): object is Strategy {
    return (
      typeof object.execute === 'function' &&
      typeof object.getName === 'function'
    );
  }
}
