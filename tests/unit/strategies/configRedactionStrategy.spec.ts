import { Strategy } from '../../../src/strategies';
import { ConfigRedactionStrategy } from '../../../src/strategies/impl/configRedactionStrategy';
import { TypeCheckers } from '../../../src/utils/typeCheckers';

describe('ConfigRedactionStrategy', () => {
  it('Throws an exception if invalid config provided', () => {
    const spy = jest
      .spyOn(TypeCheckers, 'isRedactionStrategyConfig')
      .mockReturnValueOnce(false);
    expect(() => new ConfigRedactionStrategy({ type: 'redaction' })).toThrow(
      'Invalid configuration provided for Redaction Strategy.'
    );
    spy.mockRestore();
  });
  it('Defaults to using REDACTED text', () => {
    const strategy: Strategy = new ConfigRedactionStrategy({
      type: 'redaction'
    });
    const result = strategy.execute('foobar');
    expect(result).toBe('REDACTED');
  });

  it('Allows user to set the redaction text', () => {
    const myText = 'lets redact!';
    const strategy: Strategy = new ConfigRedactionStrategy({
      type: 'redaction',
      replacementText: myText
    });
    const result = strategy.execute('foobar');
    expect(result).toBe(myText);
  });
});
