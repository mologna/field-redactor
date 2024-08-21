import { Obfuscator } from '../../src/obfuscator';
import { ObfuscatorBuilder } from '../../src/builders/obfuscatorBuilder';
import { Formatter } from '../../src/formatter';
import { RedactionStrategy } from '../../src/strategies';
import { foobarHashes } from '../mocks/hashes';
import {
  MOCK_OBFUSCATED,
  MOCK_STRATEGY_NAME,
  mockStrategy
} from '../mocks/mockStrategy';
import { commonSecretKeys } from '../mocks/secrets';
import { HASH_STRATEGIES } from '../../src/types';

describe('DataObfuscatorBuilder', () => {
  const mockDateIso = '2024-08-20T12:12:12.000Z';
  const mockDate = new Date(mockDateIso);
  const mockBigInt = BigInt(Number.MAX_SAFE_INTEGER);
  const mockString = 'foobar';
  const mockNum = 12345;
  const mockFunc = () => {};
  const strategy: HASH_STRATEGIES = 'md5';

  it('Uses a default redaction strategy if no strategy specified', () => {
    const result: Obfuscator = new ObfuscatorBuilder().build();
    expect(result.obfuscate(foobarHashes.original)).toBe(
      RedactionStrategy.DEFAULT_REDACTION_TEXT
    );
  });

  it('can build a data obfuscator with a defined strategy', () => {
    const result: Obfuscator = new ObfuscatorBuilder()
      .useStrategy(strategy)
      .build();
    expect(result.obfuscate(foobarHashes.original)).toBe(foobarHashes.md5.hex);
  });

  it('Can buidl a data obfuscator with a defined strategy and encoding', () => {
    const result: Obfuscator = new ObfuscatorBuilder()
      .useStrategy(strategy, 'base64')
      .build();
    expect(result.obfuscate(foobarHashes.original)).toBe(
      foobarHashes.md5.base64
    );
  });

  it('can build a data obfuscator with a user-supplied strategy', () => {
    const result: Obfuscator = new ObfuscatorBuilder()
      .useCustomStrategy(mockStrategy)
      .build();
    expect(result.obfuscate(foobarHashes.original)).toBe(MOCK_OBFUSCATED);
  });

  it('builds a data obfuscator with the correct defaults', () => {
    const result: Obfuscator = new ObfuscatorBuilder()
      .useCustomStrategy(mockStrategy)
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
      .useCustomStrategy(mockStrategy)
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
      .useCustomStrategy(mockStrategy)
      .useFormat(formatter)
      .build();
    expect(result.obfuscate(mockString)).toBe(
      `${MOCK_STRATEGY_NAME}[${MOCK_OBFUSCATED}]`
    );
  });

  it('builds a data obfuscator with a the default format', () => {
    const result: Obfuscator = new ObfuscatorBuilder()
      .useCustomStrategy(mockStrategy)
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
      .useCustomStrategy(mockStrategy)
      .useCustomFormatter(formatter)
      .build();
    expect(result.obfuscate(mockString)).toBe(`foobar~${MOCK_OBFUSCATED}`);
  });

  it('Builds a data obfuscator with the default secret parser', () => {
    const obfuscator: Obfuscator = new ObfuscatorBuilder().useSecretParser().build();
    const keys = {
      ...commonSecretKeys,
      foo: 'bar'
    };
    const result = obfuscator.obfuscate(keys);
    Object.keys(result).forEach((key) => {
      if (key === 'foo') {
        expect(result[key]).toBe('bar');
      } else {
        expect(result[key]).toBe(RedactionStrategy.DEFAULT_REDACTION_TEXT)
      }
    })
  });

  it('Builds a data obfuscator with custom secret parser', () => {
    const obfuscator: Obfuscator = new ObfuscatorBuilder()
      .useSecretParser({secretKeys: [/\bfoo\b/]})
      .build();
    const keys = {
      ...commonSecretKeys,
      foo: 'bar'
    };
    const result = obfuscator.obfuscate(keys);
    Object.keys(result).forEach((key) => {
      if (key === 'foo') {
        expect(result[key]).toBe(RedactionStrategy.DEFAULT_REDACTION_TEXT)
      } else {
        expect(result[key]).toBe(commonSecretKeys[key]);
      }
    })
  });

  it('Builds a data obfuscator with custom ignores', () => {
    const obfuscator: Obfuscator = new ObfuscatorBuilder()
      .useSecretParser({ignoredSecretKeys: [/\bfullname\b/i]})
      .build();
    const result = obfuscator.obfuscate(commonSecretKeys);
    Object.keys(result).forEach((key: string) => {
      if (key.toLowerCase().localeCompare('fullname') === 0) {
        expect(result[key]).toBe(commonSecretKeys[key])
      } else {
        expect(result[key]).toBe(RedactionStrategy.DEFAULT_REDACTION_TEXT)
      }
    })
  });

  it('Builds a data obfuscator with custom followSecrets rule', () => {
    const obfuscator: Obfuscator = new ObfuscatorBuilder()
    .useSecretParser({shouldNotFollow: true})
    .build();
    const sut = {
      authkey: "1234",
      password: {
        foo: {
          bar: "test"
        }
      }
    };
    const result = obfuscator.obfuscate(sut);
    console.log(result);
    expect(result.authkey).toBe(RedactionStrategy.DEFAULT_REDACTION_TEXT);
    expect(result.password.foo.bar).toBe("test");
  });
});
