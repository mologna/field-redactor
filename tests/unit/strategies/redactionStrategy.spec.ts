import { RedactionStrategy, Strategy } from '../../../src/strategies';

describe('RedactionStrategy', () => {
  it('Defaults to using REDACTED text', () => {
    const strategy: Strategy = new RedactionStrategy();
    const result = strategy.execute('foobar');
    expect(result).toBe('REDACTED');
  });

  it('Allows user to set the redaction text', () => {
    const myText = 'lets redact!';
    const strategy: Strategy = new RedactionStrategy(myText);
    const result = strategy.execute('foobar');
    expect(result).toBe(myText);
  });

  it('Can get the name of the strategy', () => {
    const strategy: Strategy = new RedactionStrategy();
    expect(strategy.getName()).toBe('redaction');
  });
});
