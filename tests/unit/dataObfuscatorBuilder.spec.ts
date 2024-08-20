import { DataObfuscator } from '../../src/dataObfuscator';
import { DataObfuscatorBuilder } from '../../src/dataObfuscator/dataObfuscatorBuilder';
import { Formatter } from '../../src/formatter';
import { STRATEGIES } from '../../src/strategies';
import { foobarHashes } from '../mocks/hashes';
import {
  MOCK_OBFUSCATED,
  MOCK_SHORT_STRATEGY_NAME,
  mockStrategy
} from '../mocks/mockStrategy';

describe('DataObfuscatorBuilder', () => {
  const mockDateIso = '2024-08-20T12:12:12.000Z';
  const mockDate = new Date(mockDateIso);
  const mockBigInt = BigInt(Number.MAX_SAFE_INTEGER);
  const mockString = 'foobar';
  const mockNum = 12345;
  const mockFunc = () => {};

  it('Throws an exception if user does not set strategy before building', () => {
    expect(() => new DataObfuscatorBuilder().build()).toThrow('Must set strategy before building.');
  })

  it('can build a data obfuscator with a defined strategy', () => {
    const result: DataObfuscator = new DataObfuscatorBuilder()
      .setStrategy(STRATEGIES.MD5_HEX)
      .build();
    expect(result.obfuscateValues(foobarHashes.original)).toBe(
      foobarHashes.md5.hex
    );
  });

  it('can build a data obfuscator with a user-supplied strategy', () => {
    const result: DataObfuscator = new DataObfuscatorBuilder()
      .setStrategy(mockStrategy)
      .build();
    expect(result.obfuscateValues(foobarHashes.original)).toBe(MOCK_OBFUSCATED);
  });

  it('builds a data obfuscator with the correct defaults', () => {
    const result: DataObfuscator = new DataObfuscatorBuilder()
      .setStrategy(mockStrategy)
      .build();
    expect(result.obfuscateValues(mockDate)).toStrictEqual(mockDate);
    expect(result.obfuscateValues(false)).toBe(false);
    expect(result.obfuscateValues(mockFunc)).toStrictEqual(mockFunc);
    expect(result.obfuscateValues(mockBigInt)).toBe(MOCK_OBFUSCATED);
    expect(result.obfuscateValues(mockString)).toBe(MOCK_OBFUSCATED);
    expect(result.obfuscateValues(mockNum)).toBe(MOCK_OBFUSCATED);
  });

  it('builds a data obfuscator with the overridden defaults', () => {
    const result: DataObfuscator = new DataObfuscatorBuilder()
      .setStrategy(mockStrategy)
      .setObfuscateBooleans(true)
      .setObfuscateDates(true)
      .setObfuscateFuncs(true)
      .build();
    expect(result.obfuscateValues(mockDate)).toStrictEqual(MOCK_OBFUSCATED);
    expect(result.obfuscateValues(false)).toBe(MOCK_OBFUSCATED);
    expect(result.obfuscateValues(mockFunc)).toStrictEqual(MOCK_OBFUSCATED);
    expect(result.obfuscateValues(mockBigInt)).toBe(MOCK_OBFUSCATED);
    expect(result.obfuscateValues(mockString)).toBe(MOCK_OBFUSCATED);
    expect(result.obfuscateValues(mockNum)).toBe(MOCK_OBFUSCATED);
  });

  it('builds a data obfuscator with a formatter string', () => {
    const formatter: string = '{{shortStrategy}}[{{value}}]';
    const result: DataObfuscator = new DataObfuscatorBuilder()
      .setStrategy(mockStrategy)
      .setFormat(formatter)
      .build();
    expect(result.obfuscateValues(mockString)).toBe(
      `${MOCK_SHORT_STRATEGY_NAME}[${MOCK_OBFUSCATED}]`
    );
  });

  it('builds a data obfuscator with a custom formatter', () => {
    const formatter: Formatter = {
      format: (value: string) => `foobar~${value}`
    };
    const result: DataObfuscator = new DataObfuscatorBuilder()
      .setStrategy(mockStrategy)
      .setFormat(formatter)
      .build();
    expect(result.obfuscateValues(mockString)).toBe(
      `foobar~${MOCK_OBFUSCATED}`
    );
  });
});
