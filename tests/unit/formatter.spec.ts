import { FormatterImpl } from '../../src/formatter';
import { HASH_STRATEGIES } from '../../src/types';

describe('Formatter', () => {
  const strategyFormat = '{{strategy}}[{{value}}]';
  const strategy: HASH_STRATEGIES = 'md5';

  it('Can create a formatter with valid formats', () => {
    expect(
      () => new FormatterImpl(strategyFormat, strategy)
    ).not.toThrow();
  });

  it('Can get the current format', () => {
    const formatter = new FormatterImpl(strategyFormat, strategy);
    expect(formatter.getFormat()).toBe(strategyFormat);
  });

  it('Does not create a formatter with invalid formats', () => {
    const noFormat = 'foobar';
    const invalidFormat = '{{qStrategy}}[{{value}}]';
    const missingValue = '{{strategy}}[foobar]';
    const multipleBadFormats = '{{qStrategy}}[foobar]{{xStrategy}}';

    const missingValueError = '{{value}} is required for formatting.';
    const qStrategyError = '{{qStrategy}} is not a valid formatter field.';
    const xStrategyError = '{{xStrategy}} is not a valid formatter field.';
    expect(() => new FormatterImpl(noFormat, strategy)).toThrow(
      missingValueError
    );
    expect(() => new FormatterImpl(missingValue, strategy)).toThrow(
      missingValueError
    );
    expect(() => new FormatterImpl(invalidFormat, strategy)).toThrow(
      qStrategyError
    );
    expect(() => new FormatterImpl(missingValue, strategy)).toThrow(
      missingValueError
    );
    expect(() => new FormatterImpl(multipleBadFormats, strategy)).toThrow(
      `${missingValueError} ${qStrategyError} ${xStrategyError}`
    );
  });

  it('Can format a strategy with value', () => {
    const formatter = new FormatterImpl(strategyFormat, strategy);
    const value = 'foobar';
    const expected = `${strategy}[${value}]`;
    expect(formatter.format(value)).toBe(expected);
  });
});
