import { Obfuscator } from '../../src/obfuscator';
import { ObfuscatorOptions } from '../../src/obfuscator/obfuscatorOptions';
import { ObfuscatorImpl } from '../../src/obfuscator/impl/obfuscatorImpl';
import { Formatter, FormatterImpl } from '../../src/formatter';
import {
  mockStrategy,
  MOCK_OBFUSCATED,
  MOCK_STRATEGY_NAME
} from '../mocks/mockStrategy';
import { commonSecretKeys } from '../mocks/secrets';
import { Secret } from '../../src/secrets/secret';

describe('Obfuscator', () => {
  const mockDateIso = '2024-08-20T12:12:12.000Z';
  const mockDate = new Date(mockDateIso);
  const mockBigInt = BigInt(Number.MAX_SAFE_INTEGER);
  const mockString = 'foobar';
  const mockNum = 12345;
  const mockFunc = () => {};
  const arrayInputWithAll = [
    null,
    undefined,
    mockString,
    mockBigInt,
    mockNum,
    mockDate,
    mockFunc
  ];
  const expectedArrayInputWithAllResult = [
    null,
    undefined,
    MOCK_OBFUSCATED,
    MOCK_OBFUSCATED,
    MOCK_OBFUSCATED,
    mockDate,
    mockFunc
  ];
  const objectInputWithAll: any = {
    a: null,
    b: undefined,
    c: mockString,
    d: mockBigInt,
    e: mockNum,
    f: mockDate,
    g: mockFunc
  };
  const expectedObjectInputWithAllResult: any = {
    a: null,
    b: undefined,
    c: MOCK_OBFUSCATED,
    d: MOCK_OBFUSCATED,
    e: MOCK_OBFUSCATED,
    f: mockDate,
    g: mockFunc
  };
  const standardOpts: ObfuscatorOptions = {
    values: {
      booleans: false,
      dates: false,
      functions: false
    }
  };
  let standardDataObfuscator: Obfuscator;
  let optionedDataObfuscator: Obfuscator;
  let emptyPiiDataObfuscator: Obfuscator;
  let secretPiiDataObfuscator: Obfuscator;
  beforeAll(() => {
    standardDataObfuscator = new ObfuscatorImpl(mockStrategy, standardOpts);
    optionedDataObfuscator = new ObfuscatorImpl(mockStrategy, {
      values: {
        booleans: true,
        dates: true,
        functions: true
      }
    });
    emptyPiiDataObfuscator = new ObfuscatorImpl(mockStrategy, {
      ...standardOpts,
      secrets: {
        parser: new Secret({
          keys: []
        })
      }
    });

    secretPiiDataObfuscator = new ObfuscatorImpl(mockStrategy, {
      ...standardOpts,
      secrets: {
        parser: new Secret()
      }
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Ignores null and undefined values', () => {
    expect(standardDataObfuscator.obfuscate(null)).toBe(null);
    expect(standardDataObfuscator.obfuscate(undefined)).toBe(undefined);
  });

  it('Ignores boolean values when not specified in options', () => {
    expect(standardDataObfuscator.obfuscate(true)).toBe(true);
    expect(standardDataObfuscator.obfuscate(false)).toBe(false);
  });

  it('Obfuscates booleans when specified in options', () => {
    expect(optionedDataObfuscator.obfuscate(true)).toBe(MOCK_OBFUSCATED);
    expect(optionedDataObfuscator.obfuscate(false)).toBe(MOCK_OBFUSCATED);
  });

  it('Ignores functions when not specified in options', () => {
    expect(standardDataObfuscator.obfuscate(mockFunc)).toBe(mockFunc);
  });

  it('Obfuscates functions when specified in options', () => {
    expect(optionedDataObfuscator.obfuscate(mockFunc)).toBe(MOCK_OBFUSCATED);
  });

  it('Obfuscates a string value in place', () => {
    expect(standardDataObfuscator.obfuscate(mockString)).toBe(MOCK_OBFUSCATED);
  });

  it('Obfuscates a number value in place', () => {
    expect(standardDataObfuscator.obfuscate(mockNum)).toBe(MOCK_OBFUSCATED);
  });

  it('Obfuscates a BigInt value in place', () => {
    expect(standardDataObfuscator.obfuscate(mockBigInt)).toBe(MOCK_OBFUSCATED);
  });

  it('Ignores datas when not specified in options', () => {
    const result = standardDataObfuscator.obfuscate(mockDate);
    expect(result).toStrictEqual(mockDate);
  });

  it('Obfuscates a Date value in place using its ISO string when specified in options', () => {
    const spy = jest.spyOn(mockStrategy, 'execute');
    const result = optionedDataObfuscator.obfuscate(mockDate);
    expect(result).toStrictEqual(MOCK_OBFUSCATED);
    expect(spy).toHaveBeenCalledWith(mockDateIso);
  });

  it('Obfuscates an array of various value types correctly', () => {
    const result = standardDataObfuscator.obfuscate(arrayInputWithAll);
    result.forEach((item: any, index: number) => {
      expect(item).toStrictEqual(expectedArrayInputWithAllResult[index]);
    });
  });

  it('Obfuscates an object of various value types correctly ', () => {
    const result = standardDataObfuscator.obfuscate(objectInputWithAll);
    Object.keys(result).forEach((key: string) => {
      expect(result[key]).toStrictEqual(expectedObjectInputWithAllResult[key]);
    });
  });

  it('Can obfuscate values with standard format', () => {
    const formatter: Formatter = new FormatterImpl(
      '{{strategy}}[{{value}}]',
      mockStrategy.getName()
    );
    const formatterDataObfuscator = new ObfuscatorImpl(mockStrategy, {
      ...standardOpts,
      formatter
    });

    expect(formatterDataObfuscator.obfuscate(mockString)).toBe(
      `${MOCK_STRATEGY_NAME}[${MOCK_OBFUSCATED}]`
    );

    expect(formatterDataObfuscator.obfuscate(mockNum)).toBe(
      `${MOCK_STRATEGY_NAME}[${MOCK_OBFUSCATED}]`
    );

    expect(formatterDataObfuscator.obfuscate(mockDate)).toStrictEqual(mockDate);
  });

  it('Can obfuscate values with custom formatter', () => {
    const formatter: Formatter = {
      format: (value: string) => `foobar~${value}`
    };

    const formatterDataObfuscator = new ObfuscatorImpl(mockStrategy, {
      ...standardOpts,
      formatter
    });

    expect(formatterDataObfuscator.obfuscate(mockString)).toBe(
      `foobar~${MOCK_OBFUSCATED}`
    );

    expect(formatterDataObfuscator.obfuscate(mockNum)).toBe(
      `foobar~${MOCK_OBFUSCATED}`
    );

    expect(formatterDataObfuscator.obfuscate(mockDate)).toStrictEqual(mockDate);
  });

  it('Can obfuscate arrays nested in objects', () => {
    const objectInputWithNestedArray: any = {
      ...objectInputWithAll,
      anArray: arrayInputWithAll
    };

    const { anArray } = standardDataObfuscator.obfuscate(
      objectInputWithNestedArray
    );
    anArray.forEach((item: any, index: number) => {
      expect(item).toStrictEqual(expectedArrayInputWithAllResult[index]);
    });
  });

  it('Can obfuscate deeply nested objects without modifying original', () => {
    const deeplyNested: any = {
      a: {
        a2: {
          a3: {
            a4: arrayInputWithAll
          }
        }
      },
      b: {
        b2: {
          b3: objectInputWithAll
        },
        b21: {
          ...objectInputWithAll,
          array: arrayInputWithAll
        }
      }
    };

    const result = standardDataObfuscator.obfuscate(deeplyNested);
    result.a.a2.a3.a4.forEach((item: any, index: number) => {
      expect(item).toStrictEqual(expectedArrayInputWithAllResult[index]);
    });
    Object.keys(result.b.b2.b3).forEach((key: string) => {
      expect(result.b.b2.b3[key]).toStrictEqual(
        expectedObjectInputWithAllResult[key]
      );
    });
    const { array, ...rest } = result.b.b21;
    array.forEach((item: any, index: number) => {
      expect(item).toStrictEqual(expectedArrayInputWithAllResult[index]);
    });
    Object.keys(rest).forEach((key: string) => {
      expect(rest[key]).toStrictEqual(expectedObjectInputWithAllResult[key]);
    });

    expect(deeplyNested.a.a2.a3.a4.includes(MOCK_OBFUSCATED)).toBeFalsy();
  });

  it('Does not obfuscate secret keys and values when keys are not specified', () => {
    const result = emptyPiiDataObfuscator.obfuscate(commonSecretKeys);
    Object.keys(result).forEach((key) => {
      expect(result[key]).toBe(commonSecretKeys[key]);
    });
  });

  it('Obfuscates secret keys and values', () => {
    const result = secretPiiDataObfuscator.obfuscate(commonSecretKeys);
    Object.keys(result).forEach((key) => {
      expect(result[key]).toBe(MOCK_OBFUSCATED);
    });
  });

  it('Can obfuscate secret keys and values and ignore others', () => {
    const nonSecretKeys: any = {
      foo: undefined,
      bar: null,
      biz: 12345,
      baz: BigInt(99999999),
      biff: false,
      baff: true,
      bang: ['foo', 'bar']
    };
    const mixedBag = {
      ...commonSecretKeys,
      ...nonSecretKeys
    };

    const result = secretPiiDataObfuscator.obfuscate(mixedBag);
    Object.keys(result).forEach((key) => {
      if (Object.keys(nonSecretKeys).includes(key)) {
        expect(result[key]).toStrictEqual(nonSecretKeys[key]);
      } else {
        expect(result[key]).toBe(MOCK_OBFUSCATED);
      }
    });
  });

  it('Can obfuscate deeply nested secret values', () => {
    const deeplyNested: any = {
      a: {
        a1: {
          a2: {
            pass: 'word'
          }
        }
      },
      b: {
        ssn: ['12345678', '12345678']
      }
    };

    const result: any = secretPiiDataObfuscator.obfuscate(deeplyNested);
    expect(result.a.a1.a2.pass).toBe(MOCK_OBFUSCATED);
    const arr = result.b.ssn;
    expect(arr[0]).toBe(MOCK_OBFUSCATED);
    expect(arr[1]).toBe(MOCK_OBFUSCATED);
  });

  it('Obfuscates deeply nested secret values even if they are not the direct child of their secret key', () => {
    const deeplyNested: any = {
      a: {
        pass: {
          b: {
            c: 'word',
            d: 'foo',
            e: 'bar'
          }
        }
      }
    };

    const result: any = secretPiiDataObfuscator.obfuscate(deeplyNested);
    const nested = result.a.pass.b;
    Object.keys(nested).forEach((key) => {
      expect(nested[key]).toBe(MOCK_OBFUSCATED);
    });
  });

  it('Does not obfuscates deeply nested secret values if shouldNotFollow is specified', () => {
    const shouldNotFollowParser = new ObfuscatorImpl(mockStrategy, {
      ...standardOpts,
      secrets: {
        parser: new Secret(),
        shouldNotFollow: true
      }
    });
    const deeplyNested: any = {
      a: {
        pass: {
          b: {
            c: 'word',
            d: 'foo',
            e: 'bar'
          }
        }
      }
    };

    const result: any = shouldNotFollowParser.obfuscate(deeplyNested);
    const nested = result.a.pass.b;
    Object.keys(nested).forEach((key) => {
      expect(nested[key]).toBe(deeplyNested.a.pass.b[key]);
    });
  });
});
