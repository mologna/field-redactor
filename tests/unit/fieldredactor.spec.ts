import { mockStrategy, MOCK_OBFUSCATED } from '../mocks/mockStrategy';
import { FieldRedactorImpl } from '../../src/fieldRedactor/impl/fieldRedactorImpl';
import {
  redactAllSecretParser,
  redactAllWithFoobarExceptionSecretsParser,
  redactNormalSecretsParser,
  redactNoSecretsParser
} from '../mocks/mockSecretParsers';
import { Values } from '../../src/types/config';
import { commonSecretKeys } from '../mocks/secrets';
describe('FieldRedactor', () => {
  const redactNoValues: Values = {
    booleans: false,
    functions: false,
    dates: false
  };

  const redactAllValues: Values = {
    booleans: true,
    functions: true,
    dates: true
  };
  const date = new Date();
  const func = () => {};
  const string = 'string';
  const bool = true;

  const redactAllWithoutValuesRedactor = new FieldRedactorImpl({
    strategy: mockStrategy,
    secretParser: redactAllSecretParser,
    values: redactNoValues,
    deepRedactSecrets: false
  });
  const redactAllWithValuesRedactor = new FieldRedactorImpl({
    strategy: mockStrategy,
    secretParser: redactAllSecretParser,
    values: redactAllValues,
    deepRedactSecrets: false
  });
  const redactDefaultSecretsRedactor = new FieldRedactorImpl({
    strategy: mockStrategy,
    secretParser: redactNormalSecretsParser,
    values: redactNoValues,
    deepRedactSecrets: false
  });
  const deepRedactDefaultSecretsRedactor = new FieldRedactorImpl({
    strategy: mockStrategy,
    secretParser: redactNormalSecretsParser,
    values: redactNoValues,
    deepRedactSecrets: true
  });
  const redactAllWithFoobarExceptionSecretsRedactor = new FieldRedactorImpl({
    strategy: mockStrategy,
    secretParser: redactAllWithFoobarExceptionSecretsParser,
    values: redactNoValues,
    deepRedactSecrets: true
  });

  describe('simple value obfuscation', () => {
    it('Does not obfuscate booleans, dates, or functions when not specified, but obfuscates other values', () => {
      expect(redactAllWithoutValuesRedactor.obfuscate(true)).toBe(true);
      expect(redactAllWithoutValuesRedactor.obfuscate(date)).toStrictEqual(
        date
      );
      expect(redactAllWithoutValuesRedactor.obfuscate(func)).toStrictEqual(
        func
      );
      expect(redactAllWithoutValuesRedactor.obfuscate('foobar')).toBe(
        MOCK_OBFUSCATED
      );
      // expect(redactAllWithoutValuesRedactor.obfuscate(BigInt(12345))).toBe(MOCK_OBFUSCATED);
      expect(redactAllWithoutValuesRedactor.obfuscate(12345)).toBe(
        MOCK_OBFUSCATED
      );
    });

    it('Obfuscates all values when specified', () => {
      expect(redactAllWithValuesRedactor.obfuscate(true)).toBe(MOCK_OBFUSCATED);
      expect(redactAllWithValuesRedactor.obfuscate(date)).toEqual(
        MOCK_OBFUSCATED
      );
      expect(redactAllWithValuesRedactor.obfuscate(func)).toEqual(
        MOCK_OBFUSCATED
      );
      expect(redactAllWithValuesRedactor.obfuscate('foobar')).toBe(
        MOCK_OBFUSCATED
      );
      // expect(redactAllWithValuesRedactor.obfuscate(BigInt(12345))).toBe(MOCK_OBFUSCATED);
      expect(redactAllWithValuesRedactor.obfuscate(12345)).toBe(
        MOCK_OBFUSCATED
      );
    });
  });

  describe('Total object redaction', () => {
    it('Obfuscates singly-nested values in object when specified', () => {
      const shouldBeRedacted = {
        date,
        func,
        bool,
        string
        // bigint
      };

      const result = redactAllWithValuesRedactor.obfuscate(shouldBeRedacted);
      Object.keys(result).forEach((key) => {
        expect(result[key]).toBe(MOCK_OBFUSCATED);
      });
    });

    it('Does not obfuscates singly-nested values in object when specified', () => {
      const shouldBeRedacted = {
        date,
        func,
        bool
      };

      const result = redactAllWithoutValuesRedactor.obfuscate(shouldBeRedacted);
      Object.keys(result).forEach((key) => {
        expect(result[key]).not.toBe(MOCK_OBFUSCATED);
      });
    });

    it('Can redact array values', () => {
      const array = ['foo', 'bar', 12345, BigInt(12)];
      const result = redactAllWithValuesRedactor.obfuscate(array);
      result.forEach((item: any) => expect(item).toBe(MOCK_OBFUSCATED));
    });

    it('Can redact nested objects', () => {
      const nested = {
        a: {
          b: {
            c: 'foobar'
          },
          d: new Date()
        },
        e: {
          f: ['foo', 'bar']
        }
      };

      const result = redactAllWithValuesRedactor.obfuscate(nested);
      expect(result.a.b.c).toBe(MOCK_OBFUSCATED);
      expect(result.a.d).toBe(MOCK_OBFUSCATED);
      const arr = result.e.f;
      expect(arr[0]).toBe(MOCK_OBFUSCATED);
      expect(arr[1]).toBe(MOCK_OBFUSCATED);
    });

    it('Can redact objects nested in arrays', () => {
      const arrayNested = [
        {
          foo: 'bar'
        },
        {
          biz: {
            baz: 'biff'
          }
        }
      ];

      const result = redactAllWithValuesRedactor.obfuscate(arrayNested);
      expect(result[0].foo).toBe(MOCK_OBFUSCATED);
      expect(result[1].biz.baz).toBe(MOCK_OBFUSCATED);
    });

    it('ignores null and undefined', () => {
      const myObj = {
        foo: 'bar',
        biz: null,
        baz: undefined
      };
      const result = redactAllWithValuesRedactor.obfuscate(myObj);
      expect(result.biz).toBeNull();
      expect(result.baz).toBeUndefined();
    });

    it('Can handle complex object structures', () => {
      const sampleLog = {
        message: 'This is a sample log output',
        data: {
          event: {
            appid: 12345,
            appAuthKey: '123456-7890',
            name: 'my-event-name',
            eventData: [
              {
                input: 'foobar',
                output: 'fizbuzz',
                address: '1234 redacted street',
                mdn: 'my-mdn'
              }
            ]
          },
          container: 'event-parser',
          runtime: 'Node.js',
          region: 'us-east-1',
          version: '1.0.12',
          env: [
            {
              IS_KUBERNETES: 'true'
            }
          ]
        }
      };
      const result = redactAllWithoutValuesRedactor.obfuscate(sampleLog);
      expect(result.message).toBe(MOCK_OBFUSCATED);
      expect(result.data.container).toBe(MOCK_OBFUSCATED);
    });
  });

  describe('Specific secret redaction', () => {
    const nestedSecrets = {
      a: {
        password: 'text',
        authkey: {
          foo: 'bar',
          arr: ['some', 'stuff'],
          foobar: 'foobar'
        }
      }
    };
    it('Only redacts secret keys when specified', () => {
      const secretsResult =
        redactDefaultSecretsRedactor.obfuscate(commonSecretKeys);
      Object.keys(secretsResult).forEach((key) => {
        expect(secretsResult[key]).toBe(MOCK_OBFUSCATED);
      });

      const nonSecrets: any = {
        foo: 'bar',
        biz: 'baz',
        my: 'stuff'
      };

      const nonSecretsResult =
        redactDefaultSecretsRedactor.obfuscate(nonSecrets);
      Object.keys(nonSecretsResult).forEach((key: string) => {
        expect(nonSecretsResult[key]).toBe(nonSecrets[key]);
      });
    });

    it('Does not follow deeply nested secret values when not specified', () => {
      const result = redactDefaultSecretsRedactor.obfuscate(nestedSecrets);
      expect(result.a.password).toBe(MOCK_OBFUSCATED);
      expect(result.a.authkey.foo).toBe('bar');
      expect(result.a.authkey.arr[0]).toBe('some');
      expect(result.a.authkey.arr[1]).toBe('stuff');
    });

    it('Follows nested secrets when specified', () => {
      const result = deepRedactDefaultSecretsRedactor.obfuscate(nestedSecrets);
      expect(result.a.password).toBe(MOCK_OBFUSCATED);
      expect(result.a.authkey.foo).toBe(MOCK_OBFUSCATED);
      expect(result.a.authkey.arr[0]).toBe(MOCK_OBFUSCATED);
      expect(result.a.authkey.arr[1]).toBe(MOCK_OBFUSCATED);
    });

    it('Ignores values when specified in ignore list', () => {
      const result =
        redactAllWithFoobarExceptionSecretsRedactor.obfuscate(nestedSecrets);
      expect(result.a.password).toBe(MOCK_OBFUSCATED);
      expect(result.a.authkey.foo).toBe(MOCK_OBFUSCATED);
      expect(result.a.authkey.arr[0]).toBe(MOCK_OBFUSCATED);
      expect(result.a.authkey.arr[1]).toBe(MOCK_OBFUSCATED);
      expect(result.a.authkey.foobar).toBe('foobar');
    });
  });

  describe('Special object redaction', () => {
    const specialObjects = {
      mySpecialObject: {
        foo: true,
        bar: false
      },
      mySpecialDeeplyNestedObject: {
        foo: true,
        bar: false,
        biz: {
          baz: {
            foobar: true,
            fizbuzz: false
          }
        }
      }
    };
    const redactSpecialSecretsRedactor = new FieldRedactorImpl({
      strategy: mockStrategy,
      secretParser: redactNoSecretsParser,
      values: redactNoValues,
      deepRedactSecrets: false,
      specialObjects
    });
    const shouldBeHere: string = 'shouldBeHere';

    it('Can redact correct fields in a special object but does not redact other fields', () => {
      const objectToRedact = {
        mySpecialObject: {
          foo: 'shouldBeGone',
          bar: shouldBeHere,
          biz: shouldBeHere,
          baz: shouldBeHere
        },
        foo: shouldBeHere,
        bar: shouldBeHere
      };
      const result = redactSpecialSecretsRedactor.obfuscate(objectToRedact);
      expect(result.foo).toBe(shouldBeHere);
      expect(result.bar).toBe(shouldBeHere);
      expect(result.mySpecialObject.foo).toBe(MOCK_OBFUSCATED);
      expect(result.mySpecialObject.bar).toBe(shouldBeHere);
      expect(result.mySpecialObject.biz).toBe(shouldBeHere);
      expect(result.mySpecialObject.baz).toBe(shouldBeHere);
    });

    it('Can handle deeply nested secret objects', () => {
      const objectToRedact = {
        mySpecialDeeplyNestedObject: {
          foo: 'shouldBeGone',
          bar: shouldBeHere,
          biz: {
            baz: {
              foobar: 'sholdBeGone',
              fizbuzz: shouldBeHere
            }
          }
        },
        foo: shouldBeHere,
        bar: shouldBeHere
      };
      const result = redactSpecialSecretsRedactor.obfuscate(objectToRedact);
      expect(result.foo).toBe(shouldBeHere);
      expect(result.bar).toBe(shouldBeHere);
      expect(result.mySpecialDeeplyNestedObject.foo).toBe(MOCK_OBFUSCATED);
      expect(result.mySpecialDeeplyNestedObject.bar).toBe(shouldBeHere);
      expect(result.mySpecialDeeplyNestedObject.biz.baz.foobar).toBe(
        MOCK_OBFUSCATED
      );
      expect(result.mySpecialDeeplyNestedObject.biz.baz.fizbuzz).toBe(
        shouldBeHere
      );
    });

    it('Can perform partial matching', () => {
      const objectToRedact = {
        mySpecialDeeplyNestedObject: {
          foo: 'shouldBeGone',
          biz: {
            baz: {
              foobar: 'sholdBeGone'
            }
          }
        },
        bar: shouldBeHere
      };

      const result = redactSpecialSecretsRedactor.obfuscate(objectToRedact);
      expect(result.bar).toBe(shouldBeHere);
      expect(result.mySpecialDeeplyNestedObject.foo).toBe(MOCK_OBFUSCATED);
      expect(result.mySpecialDeeplyNestedObject.biz.baz.foobar).toBe(
        MOCK_OBFUSCATED
      );
    });

    it('Does not perform partial matching when strict match flag is passed', () => {
      const strictMatchSpecialSecretsRedactor = new FieldRedactorImpl({
        strategy: mockStrategy,
        secretParser: redactNoSecretsParser,
        values: redactNoValues,
        deepRedactSecrets: false,
        specialObjects,
        strictMatchSpecialObjects: true
      });

      // Missing data from format
      const missingDataObject = {
        mySpecialDeeplyNestedObject: {
          foo: 'shouldBeGone',
          biz: {
            baz: {
              foobar: 'shouldBeGone'
            }
          }
        },
        bar: shouldBeHere
      };
      const missingDataResult =
        strictMatchSpecialSecretsRedactor.obfuscate(missingDataObject);
      expect(missingDataResult.bar).toBe(shouldBeHere);
      expect(missingDataResult.mySpecialDeeplyNestedObject.foo).toBe(
        'shouldBeGone'
      );
      expect(missingDataResult.mySpecialDeeplyNestedObject.biz.baz.foobar).toBe(
        'shouldBeGone'
      );

      // Extra data included
      const extraDataObject = {
        mySpecialDeeplyNestedObject: {
          foo: 'shouldBeGone',
          bar: shouldBeHere,
          biz: {
            baz: {
              foobar: 'sholdBeGone',
              fizbuzz: shouldBeHere,
              foosball: 'biff'
            }
          }
        },
        foo: shouldBeHere,
        bar: shouldBeHere
      };

      const extraDataResult =
        redactSpecialSecretsRedactor.obfuscate(extraDataObject);
      expect(extraDataResult.foo).toBe(shouldBeHere);
      expect(extraDataResult.bar).toBe(shouldBeHere);
      expect(extraDataResult.mySpecialDeeplyNestedObject.foo).toBe(
        MOCK_OBFUSCATED
      );
      expect(extraDataResult.mySpecialDeeplyNestedObject.bar).toBe(
        shouldBeHere
      );
      expect(extraDataResult.mySpecialDeeplyNestedObject.biz.baz.foobar).toBe(
        MOCK_OBFUSCATED
      );
      expect(extraDataResult.mySpecialDeeplyNestedObject.biz.baz.fizbuzz).toBe(
        shouldBeHere
      );
    });

    // todo add tests and code to handle array types
  });
});