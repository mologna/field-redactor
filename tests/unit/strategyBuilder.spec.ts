import { StrategyBuilder } from '../../src/builders/strategyBuilder';
import { RedactionStrategy } from '../../src/strategies';
import { HASH_STRATEGIES } from '../../src/types';
import { HashMocks } from '../mocks';

describe('StrategyBuilder', () => {
  it('Builds a redaction strategy by default with standard encoding', () => {
    const builder = new StrategyBuilder();
    const strategy = builder.build();
    expect(strategy.getName()).toBe('redaction');
    expect(strategy.execute('foobar')).toBe(
      RedactionStrategy.DEFAULT_REDACTION_TEXT
    );
  });

  it('Builds a redaction strategy by default custom encoding', () => {
    const builder = new StrategyBuilder();
    const encoding = 'FOOBAR';
    const strategy = builder.setEncoding(encoding).build();
    expect(strategy.getName()).toBe('redaction');
    expect(strategy.execute('foobar')).toBe(encoding);
  });

  it('Can build a redaction strategy by specifying', () => {
    const builder = new StrategyBuilder();
    const strategy = builder.setStrategy('redaction').build();
    expect(strategy.getName()).toBe('redaction');
    expect(strategy.execute('foobar')).toBe(
      RedactionStrategy.DEFAULT_REDACTION_TEXT
    );
  });

  it('Can build a hash strategy with default encoding', () => {
    const builder = new StrategyBuilder();
    const strategy = builder.setStrategy('md5').build();
    expect(strategy.getName()).toBe('md5');
    expect(strategy.execute(HashMocks.foobarHashes.original)).toBe(
      HashMocks.foobarHashes.md5.hex
    );
  });

  it('Can build a hash strategy with custom encoding', () => {
    const builder = new StrategyBuilder();
    const strategy = builder.setStrategy('md5').setEncoding('base64').build();
    expect(strategy.getName()).toBe('md5');
    expect(strategy.execute(HashMocks.foobarHashes.original)).toBe(
      HashMocks.foobarHashes.md5.base64
    );
  });

  it('Throws an exeption if invalid encoding provided to hash strategy', () => {
    const builder = new StrategyBuilder();
    expect(() =>
      builder.setStrategy('md5').setEncoding('foobar').build()
    ).toThrow('Invalid encoding supplied for hash strategy.');
  });

  it('Throws an exception if unknown strategy provided', () => {
    const builder = new StrategyBuilder();
    expect(() => {
      builder.setStrategy('foobar' as unknown as HASH_STRATEGIES).build();
    }).toThrow('Unknown strategy specified.');
  });
});
