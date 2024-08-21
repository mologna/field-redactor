import { FormatterImpl } from '../../src/formatter';
import { STRATEGIES } from '../../src/strategies';

describe('Formatter', () => {
  const strategyFormat = '{{strategy}}[{{value}}]';

  it('Can create a formatter with valid formats', () => {
    expect(
      () => new FormatterImpl(strategyFormat, STRATEGIES.MD5_HEX)
    ).not.toThrow();
  });

  it('Can get the current format', () => {
    const formatter = new FormatterImpl(strategyFormat, STRATEGIES.MD5_HEX);
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
    expect(() => new FormatterImpl(noFormat, STRATEGIES.MD5_HEX)).toThrow(
      missingValueError
    );
    expect(() => new FormatterImpl(missingValue, STRATEGIES.MD5_HEX)).toThrow(
      missingValueError
    );
    expect(() => new FormatterImpl(invalidFormat, STRATEGIES.MD5_HEX)).toThrow(
      qStrategyError
    );
    expect(() => new FormatterImpl(missingValue, STRATEGIES.MD5_HEX)).toThrow(
      missingValueError
    );
    expect(() => new FormatterImpl(multipleBadFormats, STRATEGIES.MD5_HEX)).toThrow(
      `${missingValueError} ${qStrategyError} ${xStrategyError}`
    );
  });

  it('Can format a strategy with value', () => {
    const strategy = STRATEGIES.MD5_HEX;
    const formatter = new FormatterImpl(strategyFormat, STRATEGIES.MD5_HEX);
    const value = 'foobar';
    const expected = `${strategy}[${value}]`;
    expect(formatter.format(value)).toBe(expected);
  });
});
