import { FormatterBuilder } from '../../src/builder/formatterBuilder';
import { Formatter } from '../../src/formatter';

describe('FormatterBuilder', () => {
  it('Throws an exception if you do not specify a strategy', () => {
    expect(() => new FormatterBuilder().build()).toThrow(
      'Must specify format strategy before building.'
    );
  });

  it('Allows a user to create a formatter with the default format string', () => {
    const strategy = 'foo';
    const value = 'bar';
    const defaultFormat = FormatterBuilder.DEFAULT_FORMAT;
    const expectedResult = defaultFormat
      .replace('{{strategy}}', strategy)
      .replace('{{value}}', value);
    const format: Formatter = new FormatterBuilder()
      .setFormatStrategy(strategy)
      .build();
    expect(format.format(value)).toBe(expectedResult);
  });

  it('Allows a user to create a formatter with a custom strategy', () => {
    const formatString = '{{value}}-{{strategy}}';
    const strategy = 'foo';
    const value = 'bar';
    const expectedResult = formatString
      .replace('{{strategy}}', strategy)
      .replace('{{value}}', value);
    const format: Formatter = new FormatterBuilder()
      .setFormatStrategy(strategy)
      .setFormatString(formatString)
      .build();
    expect(format.format(value)).toBe(expectedResult);
  });
});
