import { Obfuscator } from "../../src/obfuscator";
import { PiiObfuscatorImpl } from '../../src/obfuscator/impl/piiObfuscatorImpl';
import { ObfuscatorOptions } from "../../src/obfuscator/obfuscatorOptions";
import { Secret } from "../../src/secrets/secret";
import { MOCK_OBFUSCATED, mockStrategy } from "../mocks/mockStrategy";
import { commonSecretKeys } from "../mocks/secrets";

describe('piiDataObfuscator', () => {
  let emptyPiiDataObfuscator: Obfuscator;
  let secretPiiDataObfuscator: Obfuscator;

  const standardOpts: ObfuscatorOptions = {
    values: {
      booleans: false,
      dates: false,
      functions: false
    }
  };

  beforeAll(() => {
    emptyPiiDataObfuscator = new PiiObfuscatorImpl(mockStrategy, {
      ...standardOpts,
      secret: new Secret({
        keys: []
      })
    });

    secretPiiDataObfuscator =  new PiiObfuscatorImpl(mockStrategy, {
      ...standardOpts,
      secret: new Secret()
    });
  });

  it('Does not obfuscate secret keys and values when keys are not specified', () => {
    const result = emptyPiiDataObfuscator.obfuscate(commonSecretKeys);
    Object.keys(result).forEach((key) => {
      expect(result[key]).toBe(commonSecretKeys[key]);
    })
  });

  it('Obfuscates secret keys and values', () => {
    const result = secretPiiDataObfuscator.obfuscate(commonSecretKeys);
    Object.keys(result).forEach((key) => {
      expect(result[key]).toBe(MOCK_OBFUSCATED);
    })
  });

  it('Can obfuscate secret keys and values and ignore others', () => {
    const nonSecretKeys: any = {
      foo: undefined,
      bar: null,
      biz: 12345,
      baz: BigInt(99999999),
      biff: false,
      baff: true
    };
    const mixedBag = {
      ...commonSecretKeys,
      ...nonSecretKeys
    };

    const result = secretPiiDataObfuscator.obfuscate(commonSecretKeys);
    Object.keys(result).forEach((key) => {
      if (key in Object.keys(nonSecretKeys)) {
        expect(result[key]).toBe(nonSecretKeys[key])
      } else {
        expect(result[key]).toBe(MOCK_OBFUSCATED);
      }
    })
  });

  it('Can obfuscate deeply nested secret values', () => {
    const deeplyNested: any = {
      a: {
        a1: {
          a2: {
            pass: "word"
          }
        }
      },
      b: {
        ssn: ["12345678", "12345678"]
      }
    };

    const result: any = secretPiiDataObfuscator.obfuscate(deeplyNested);
    expect(result.a.a1.a2.pass).toBe(MOCK_OBFUSCATED);
    const arr = result.b.ssn;
    expect(arr[0]).toBe(MOCK_OBFUSCATED);
    expect(arr[1]).toBe(MOCK_OBFUSCATED);
  });
});