import { getRedactionStrategy } from '../../../src/strategies/impl/redactionStrategy';

describe('ConfigRedactionStrategy', () => {
  it('Can redact text to using REDACTED text', () => {
    const result = getRedactionStrategy()('foobar');
    expect(result).toBe('REDACTED');
  });
});
