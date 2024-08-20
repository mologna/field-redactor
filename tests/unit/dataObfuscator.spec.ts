import { DataObfuscator } from '../../src/dataObfuscator';
import { DataObfuscatorImpl } from '../../src/dataObfuscator/impl/dataObfuscatorImpl';
import { mockStrategy, MOCK_OBFUSCATED } from '../mocks/mockStrategy';

describe('dataObfuscator', () => {
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

  let standardDataObfuscator: DataObfuscator;
  let optionedDataObfuscator: DataObfuscator;
  beforeAll(() => {
    standardDataObfuscator = new DataObfuscatorImpl(mockStrategy);
    optionedDataObfuscator = new DataObfuscatorImpl(mockStrategy, {
      obfuscateBooleans: true,
      obfuscateDates: true,
      obfuscateFunctions: true
    })
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Ignores null and undefined values', () => {
    expect(standardDataObfuscator.obfuscateValues(null)).toBe(null);
    expect(standardDataObfuscator.obfuscateValues(undefined)).toBe(undefined);
  });

  it('Ignores boolean values when not specified in options', () => {
    expect(standardDataObfuscator.obfuscateValues(true)).toBe(true);
    expect(standardDataObfuscator.obfuscateValues(false)).toBe(false);
  });

  it('Obfuscates booleans when specified in options', () => {
    expect(optionedDataObfuscator.obfuscateValues(true)).toBe(MOCK_OBFUSCATED);
    expect(optionedDataObfuscator.obfuscateValues(false)).toBe(MOCK_OBFUSCATED);
  });

  it('Ignores functions when not specified in options', () => {
    expect(standardDataObfuscator.obfuscateValues(mockFunc)).toBe(mockFunc);
  });

  it('Obfuscates functions when specified in options', () => {
    expect(optionedDataObfuscator.obfuscateValues(mockFunc)).toBe(MOCK_OBFUSCATED);
  });

  it('Obfuscates a string value in place', () => {
    expect(standardDataObfuscator.obfuscateValues(mockString)).toBe(MOCK_OBFUSCATED);
  });

  it('Obfuscates a number value in place', () => {
    expect(standardDataObfuscator.obfuscateValues(mockNum)).toBe(MOCK_OBFUSCATED);
  });

  it('Obfuscates a BigInt value in place', () => {
    expect(standardDataObfuscator.obfuscateValues(mockBigInt)).toBe(MOCK_OBFUSCATED);
  });

  it('Ignores datas when not specified in options', () => {
    const result = standardDataObfuscator.obfuscateValues(mockDate);
    expect(result).toStrictEqual(mockDate);
  });

  it('Obfuscates a Date value in place using its ISO string when specified in options', () => {
    const spy = jest.spyOn(mockStrategy, 'execute');
    const result = optionedDataObfuscator.obfuscateValues(mockDate);
    expect(result).toStrictEqual(MOCK_OBFUSCATED);
    expect(spy).toHaveBeenCalledWith(mockDateIso);
  });

  it('Obfuscates an array of various value types correctly', () => {
    const result = standardDataObfuscator.obfuscateValues(arrayInputWithAll);
    result.forEach((item: any, index: number) => {
      expect(item).toStrictEqual(expectedArrayInputWithAllResult[index]);
    });
  });

  it('Obfuscates an object of various value types correctly ', () => {
    const result = standardDataObfuscator.obfuscateValues(objectInputWithAll);
    Object.keys(result).forEach((key: string) => {
      expect(result[key]).toStrictEqual(expectedObjectInputWithAllResult[key]);
    });
  });

  it('Can obfuscate arrays nested in objects', () => {
    const objectInputWithNestedArray: any = {
      ...objectInputWithAll,
      anArray: arrayInputWithAll
    };

    const { anArray } = standardDataObfuscator.obfuscateValues(
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

    const result = standardDataObfuscator.obfuscateValues(deeplyNested);
    result.a.a2.a3.a4.forEach((item: any, index: number) => {
      expect(item).toStrictEqual(expectedArrayInputWithAllResult[index]);
    });
    Object.keys(result.b.b2.b3).forEach((key: string) => {
      expect(result.b.b2.b3[key]).toStrictEqual(expectedObjectInputWithAllResult[key]);
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
});
