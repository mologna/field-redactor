import { CustomObject } from '../../src/types';
import { CustomObjectRedactor } from '../../src/customObjectRedactor';
import { Redactor } from '../../src/redactor';
import { SecretManager } from '../../src/secretManager';

describe('CustomObjectRedactor', () => {
  const REDACTION_TEXT: string = 'REDACTED';
  const mockRedactor: Redactor = () => REDACTION_TEXT;
  let customObjectRedactor: CustomObjectRedactor;
  let secrets: RegExp[] = [/email/];
  let secretManager: SecretManager = new SecretManager(secrets);

  beforeEach(() => {
    customObjectRedactor = new CustomObjectRedactor(
      secretManager,
      mockRedactor
    );
  });

  describe('getMatchingSpecialObject', () => {
    it('getMatchingSpecialObject Can determine a special object with only one level', () => {
      const specialObject: CustomObject = {
        foo: true,
        bar: false
      };
      customObjectRedactor.setCustomObjects([specialObject]);
      const result = customObjectRedactor.getMatchingCustomObject({
        foo: 'fizz',
        bar: 'buzz'
      });
      expect(result).toEqual(specialObject);
    });

    it('Can handle null and undefined field values', () => {
      const specialObject: CustomObject = {
        foo: true,
        bar: false
      };
      customObjectRedactor.setCustomObjects([specialObject]);
      const result = customObjectRedactor.getMatchingCustomObject({
        foo: null,
        bar: undefined
      });
      expect(result).toEqual(specialObject);
    });

    it('Can handle array field values', () => {
      const specialObject: CustomObject = {
        foo: true,
        bar: false
      };
      customObjectRedactor.setCustomObjects([specialObject]);
      const result = customObjectRedactor.getMatchingCustomObject({
        foo: ['fizz'],
        bar: ['buzz']
      });
      expect(result).toEqual(specialObject);
    });

    it('getMatchingSpecialObject Does not consider an object a special object if it has extra keys despite matching everywhere else', () => {
      const specialObject: CustomObject = {
        foo: true,
        bar: false
      };
      customObjectRedactor.setCustomObjects([specialObject]);
      const result = customObjectRedactor.getMatchingCustomObject({
        foo: 'fizz',
        bar: 'buzz',
        bim: 'bam'
      });
      expect(result).toBeUndefined();
    });

    it('getMatchingSpecialObject Can handle nested special objects one deep', () => {
      const specialObject: CustomObject = {
        foo: {
          bar: true,
          baz: false
        }
      };
      customObjectRedactor.setCustomObjects([specialObject]);
      const result = customObjectRedactor.getMatchingCustomObject({
        foo: { bar: 'fizz', baz: 'buzz' }
      });
      expect(result).toEqual(specialObject);
    });

    it('getMatchingSpecialObject Can handle nested special objects multiple layers deep', () => {
      const specialObject: CustomObject = {
        foo: {
          bar: {
            baz: true,
            bim: false
          }
        }
      };
      customObjectRedactor.setCustomObjects([specialObject]);
      const result = customObjectRedactor.getMatchingCustomObject({
        foo: { bar: { baz: 'fizz', bim: 'false' } }
      });
      expect(result).toEqual(specialObject);
    });

    it('getMatchingSpecialObject Does not consider null, undefined, array, or non-object values special objects', () => {
      const specialObject: CustomObject = {
        foo: true,
        bar: false
      };

      customObjectRedactor.setCustomObjects([specialObject]);
      const result1 = customObjectRedactor.getMatchingCustomObject(null);
      const result2 = customObjectRedactor.getMatchingCustomObject(undefined);
      const result3 = customObjectRedactor.getMatchingCustomObject([]);
      const result4 = customObjectRedactor.getMatchingCustomObject('foo');
      const result5 = customObjectRedactor.getMatchingCustomObject(123);
      expect(result1).toBeUndefined();
      expect(result2).toBeUndefined();
      expect(result3).toBeUndefined();
      expect(result4).toBeUndefined();
      expect(result5).toBeUndefined();
    });

    it('Can find a matching special object in a list of special objects', () => {
      const specialObjects: CustomObject[] = [
        {
          foo: true,
          bar: false
        },
        {
          bim: true,
          bam: true
        }
      ];
      customObjectRedactor.setCustomObjects(specialObjects);
      const result1 = customObjectRedactor.getMatchingCustomObject({
        foo: 'fizz',
        bar: 'buzz'
      });
      expect(result1).toEqual(specialObjects[0]);

      const result2 = customObjectRedactor.getMatchingCustomObject({
        bim: 'fizz',
        bam: 'buzz'
      });
      expect(result2).toEqual(specialObjects[1]);

      const result3 = customObjectRedactor.getMatchingCustomObject({
        foo: 'fizz',
        bar: 'buzz',
        bim: 'bam'
      });
      expect(result3).toBeUndefined();
    });

    it('Can handle an empty list of special objects', () => {
      customObjectRedactor.setCustomObjects([]);
      const result = customObjectRedactor.getMatchingCustomObject({
        foo: 'fizz',
        bar: 'buzz'
      });
      expect(result).toBeUndefined();
    });
  });

  describe('redactSpecialObjectInPlace', () => {
    it('Redacts a special object in place', () => {
      const specialObject: CustomObject = {
        foo: true,
        bar: false
      };
      const obj = { foo: 'fizz', bar: 'buzz' };
      customObjectRedactor.redactCustomObjectInPlace(obj, specialObject);
      expect(obj).toEqual({ foo: REDACTION_TEXT, bar: 'buzz' });
    });

    it('Redacts a nested special object in place', () => {
      const specialObject: CustomObject = {
        foo: {
          bar: true,
          baz: false
        }
      };
      customObjectRedactor.setCustomObjects([specialObject]);
      const obj = { foo: { bar: 'fizz', baz: 'buzz' } };
      customObjectRedactor.redactCustomObjectInPlace(obj, specialObject);
      expect(obj).toEqual({ foo: { bar: REDACTION_TEXT, baz: 'buzz' } });
    });

    it('Can handle nested special objects multiple layers deep', () => {
      const specialObject: CustomObject = {
        foo: {
          bar: {
            baz: true,
            bim: false
          }
        }
      };
      customObjectRedactor.setCustomObjects([specialObject]);
      const obj = { foo: { bar: { baz: 'fizz', bim: 'buzz' } } };
      customObjectRedactor.redactCustomObjectInPlace(obj, specialObject);
      expect(obj).toEqual({
        foo: { bar: { baz: REDACTION_TEXT, bim: 'buzz' } }
      });
    });

    it('Does not redact null, or undefined values by default', () => {
      const specialObject: CustomObject = {
        foo: true,
        bar: true
      };
      customObjectRedactor.setCustomObjects([specialObject]);
      const obj = { foo: null, bar: undefined };
      customObjectRedactor.redactCustomObjectInPlace(obj, specialObject);
      expect(obj).toEqual({ foo: null, bar: undefined });
    });

    it('Can redact null, or undefined values if specified', () => {
      const specialObject: CustomObject = {
        foo: true,
        bar: true
      };
      customObjectRedactor.setCustomObjects([specialObject]);
      customObjectRedactor.setRedactNullOrUndefined(true);
      const obj = { foo: null, bar: undefined };
      customObjectRedactor.redactCustomObjectInPlace(obj, specialObject);
      expect(obj).toEqual({ foo: REDACTION_TEXT, bar: REDACTION_TEXT });
    });

    it('Can handle a special object where the value is an array', () => {
      const specialObject: CustomObject = {
        foo: false,
        bar: true
      };
      customObjectRedactor.setCustomObjects([specialObject]);
      const obj = { foo: 'bim', bar: ['fizz', 'buzz'] };
      customObjectRedactor.redactCustomObjectInPlace(obj, specialObject);
      expect(obj.foo).toEqual('bim');
      expect(obj.bar).toStrictEqual([REDACTION_TEXT, REDACTION_TEXT]);
    });

    it('Uses the secretManager to determine if a string-specified value is a secret key', () => {
      const specialObject: CustomObject = {
        name: false,
        kind: false,
        value: 'name'
      };

      customObjectRedactor.setCustomObjects([specialObject]);
      const obj = { name: 'email', kind: 'String', value: 'foo.bar@gmail.com' };
      customObjectRedactor.redactCustomObjectInPlace(obj, specialObject);
      expect(obj).toEqual({
        name: 'email',
        kind: 'String',
        value: REDACTION_TEXT
      });
    });

    it('Does not redact a value if the string-specified field does not contain a secret key', () => {
      const specialObject: CustomObject = {
        name: false,
        kind: false,
        value: 'name'
      };

      customObjectRedactor.setCustomObjects([specialObject]);
      const obj = {
        name: 'notredacted',
        kind: 'String',
        value: 'foo.bar@gmail.com'
      };
      customObjectRedactor.redactCustomObjectInPlace(obj, specialObject);
      expect(obj).toEqual({
        name: 'notredacted',
        kind: 'String',
        value: 'foo.bar@gmail.com'
      });
    });

    it('Does not redact a value or fail if the string-specified field does not exist', () => {
      const specialObject: CustomObject = {
        name: false,
        kind: false,
        value: 'foobar'
      };

      customObjectRedactor.setCustomObjects([specialObject]);
      const obj = { name: 'email', kind: 'String', value: 'foo.bar@gmail.com' };
      customObjectRedactor.redactCustomObjectInPlace(obj, specialObject);
      expect(obj).toEqual({
        name: 'email',
        kind: 'String',
        value: 'foo.bar@gmail.com'
      });
    });
  });
});
