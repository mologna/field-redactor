import { Strategy } from '../../../src/strategies';
import { RedactionStrategy } from '../../../src/strategies/impl/redactionStrategy';
import { TypeCheckers } from '../../../src/utils/typeCheckers';

describe('ConfigRedactionStrategy', () => {
  it('Throws an exception if invalid config provided', () => {
    const spy = jest
      .spyOn(TypeCheckers, 'isRedactionStrategyConfig')
      .mockReturnValueOnce(false);
    expect(() => new RedactionStrategy({ type: 'redaction' })).toThrow(
      'Invalid configuration provided for Redaction Strategy.'
    );
    spy.mockRestore();
  });
  it('Defaults to using REDACTED text', () => {
    const strategy: Strategy = new RedactionStrategy({
      type: 'redaction'
    });
    const result = strategy.execute('foobar');
    expect(result).toBe('REDACTED');
  });

  it('Allows user to set the redaction text', () => {
    const myText = 'lets redact!';
    const strategy: Strategy = new RedactionStrategy({
      type: 'redaction',
      replacementText: myText
    });
    const result = strategy.execute('foobar');
    expect(result).toBe(myText);
  });
});
