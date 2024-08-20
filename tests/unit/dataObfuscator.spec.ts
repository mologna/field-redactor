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
    MOCK_OBFUSCATED,
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

  let dataObfuscator: DataObfuscator;
  beforeAll(() => {
    dataObfuscator = new DataObfuscatorImpl(mockStrategy);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Ignores null and undefined values', () => {
    expect(dataObfuscator.obfuscateValues(null)).toBe(null);
    expect(dataObfuscator.obfuscateValues(undefined)).toBe(undefined);
  });

  it('Ignores boolean values', () => {
    expect(dataObfuscator.obfuscateValues(true)).toBe(true);
    expect(dataObfuscator.obfuscateValues(false)).toBe(false);
  });

  it('Ignores functions', () => {
    expect(dataObfuscator.obfuscateValues(mockFunc)).toBe(mockFunc);
  });

  it('Obfuscates a string value in place', () => {
    expect(dataObfuscator.obfuscateValues(mockString)).toBe(MOCK_OBFUSCATED);
  });

  it('Obfuscates a number value in place', () => {
    expect(dataObfuscator.obfuscateValues(mockNum)).toBe(MOCK_OBFUSCATED);
  });

  it('Obfuscates a BigInt value in place', () => {
    expect(dataObfuscator.obfuscateValues(mockBigInt)).toBe(MOCK_OBFUSCATED);
  });

  it('Obfuscates a Date value in place using its ISO string', () => {
    const spy = jest.spyOn(mockStrategy, 'execute');
    const result = dataObfuscator.obfuscateValues(mockDate);
    expect(result).toBe(MOCK_OBFUSCATED);
    expect(spy).toHaveBeenCalledWith(mockDateIso);
  });

  it('Obfuscates an array of various value types correctly', () => {
    const result = dataObfuscator.obfuscateValues(arrayInputWithAll);
    result.forEach((item: any, index: number) => {
      expect(item).toBe(expectedArrayInputWithAllResult[index]);
    });
  });

  it('Obfuscates an object of various value types correctly ', () => {
    const expectedOutput: any = {
      a: null,
      b: undefined,
      c: MOCK_OBFUSCATED,
      d: MOCK_OBFUSCATED,
      e: MOCK_OBFUSCATED,
      f: MOCK_OBFUSCATED,
      g: mockFunc
    };

    const result = dataObfuscator.obfuscateValues(objectInputWithAll);
    Object.keys(result).forEach((key: string) => {
      expect(result[key]).toBe(expectedOutput[key]);
    });
  });

  it('Can handle arrays nested in objects', () => {
    const objectInputWithNestedArray: any = {
      ...objectInputWithAll,
      anArray: arrayInputWithAll
    };

    const { anArray } = dataObfuscator.obfuscateValues(
      objectInputWithNestedArray
    );
    anArray.forEach((item: any, index: number) => {
      expect(item).toBe(expectedArrayInputWithAllResult[index]);
    });
  });
});
