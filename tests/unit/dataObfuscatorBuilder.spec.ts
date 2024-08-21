import { Obfuscator } from '../../src/obfuscator';
import { ObfuscatorBuilder } from '../../src/builders/obfuscatorBuilder';
import { Formatter } from '../../src/formatter';
import { HASH_STRATEGIES } from '../../src/strategies';
import { foobarHashes } from '../mocks/hashes';
import {
  MOCK_OBFUSCATED,
  MOCK_STRATEGY_NAME,
  mockStrategy
} from '../mocks/mockStrategy';

describe('DataObfuscatorBuilder', () => {
  const mockDateIso = '2024-08-20T12:12:12.000Z';
  const mockDate = new Date(mockDateIso);
  const mockBigInt = BigInt(Number.MAX_SAFE_INTEGER);
  const mockString = 'foobar';
  const mockNum = 12345;
  const mockFunc = () => {};
  const strategy: HASH_STRATEGIES = 'md5';

  it('Throws an exception if user does not set strategy before building', () => {
    expect(() => new ObfuscatorBuilder().build()).toThrow('Must set strategy before building.');
  })

  it('can build a data obfuscator with a defined strategy', () => {
    const result: Obfuscator = new ObfuscatorBuilder()
      .setStrategy(strategy)
      .build();
    expect(result.obfuscate(foobarHashes.original)).toBe(
      foobarHashes.md5.hex
    );
  });

  it('can build a data obfuscator with a user-supplied strategy', () => {
    const result: Obfuscator = new ObfuscatorBuilder()
      .setStrategy(mockStrategy)
      .build();
    expect(result.obfuscate(foobarHashes.original)).toBe(MOCK_OBFUSCATED);
  });

  it('builds a data obfuscator with the correct defaults', () => {
    const result: Obfuscator = new ObfuscatorBuilder()
      .setStrategy(mockStrategy)
      .build();
    expect(result.obfuscate(mockDate)).toStrictEqual(mockDate);
    expect(result.obfuscate(false)).toBe(false);
    expect(result.obfuscate(mockFunc)).toStrictEqual(mockFunc);
    expect(result.obfuscate(mockBigInt)).toBe(MOCK_OBFUSCATED);
    expect(result.obfuscate(mockString)).toBe(MOCK_OBFUSCATED);
    expect(result.obfuscate(mockNum)).toBe(MOCK_OBFUSCATED);
  });

  it('builds a data obfuscator with the overridden defaults', () => {
    const result: Obfuscator = new ObfuscatorBuilder()
      .setStrategy(mockStrategy)
      .setObfuscateBooleans(true)
      .setObfuscateDates(true)
      .setObfuscateFuncs(true)
      .build();
    expect(result.obfuscate(mockDate)).toStrictEqual(MOCK_OBFUSCATED);
    expect(result.obfuscate(false)).toBe(MOCK_OBFUSCATED);
    expect(result.obfuscate(mockFunc)).toStrictEqual(MOCK_OBFUSCATED);
    expect(result.obfuscate(mockBigInt)).toBe(MOCK_OBFUSCATED);
    expect(result.obfuscate(mockString)).toBe(MOCK_OBFUSCATED);
    expect(result.obfuscate(mockNum)).toBe(MOCK_OBFUSCATED);
  });

  it('builds a data obfuscator with a formatter string', () => {
    const formatter: string = '{{strategy}}[{{value}}]';
    const result: Obfuscator = new ObfuscatorBuilder()
      .setStrategy(mockStrategy)
      .useFormat(formatter)
      .build();
    expect(result.obfuscate(mockString)).toBe(
      `${MOCK_STRATEGY_NAME}[${MOCK_OBFUSCATED}]`
    );
  });

  it('builds a data obfuscator with a the default format', () => {
    const result: Obfuscator = new ObfuscatorBuilder()
      .setStrategy(mockStrategy)
      .useFormat()
      .build();
    expect(result.obfuscate(mockString)).toBe(
      `${MOCK_STRATEGY_NAME}[${MOCK_OBFUSCATED}]`
    );
  });

  it('builds a data obfuscator with a custom formatter', () => {
    const formatter: Formatter = {
      format: (value: string) => `foobar~${value}`
    };
    const result: Obfuscator = new ObfuscatorBuilder()
      .setStrategy(mockStrategy)
      .useFormat(formatter)
      .build();
    expect(result.obfuscate(mockString)).toBe(
      `foobar~${MOCK_OBFUSCATED}`
    );
  });
});
