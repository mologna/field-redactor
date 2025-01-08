import { CustomObjectChecker } from '../../src/customObjectChecker';
import { FieldRedactorConfigurationError } from '../../src/errors';
import { CustomObject, CustomObjectMatchType } from '../../src/types';

describe('CustomObjectChecker', () => {
  describe('getMatchingSpecialObject', () => {
    it('can return a matching CustomObject with all CustomObjectMatchTypes', () => {
      const specialObject: CustomObject = {
        foo: CustomObjectMatchType.Full,
        bar: CustomObjectMatchType.Deep,
        bim: CustomObjectMatchType.Shallow,
        bam: CustomObjectMatchType.Pass,
        buzz: CustomObjectMatchType.Ignore
      };
      const checker = new CustomObjectChecker([specialObject]);
      const result = checker.getMatchingCustomObject({
        foo: 'fizz',
        bar: 'buzz',
        bim: 'bam',
        bam: 'bim',
        buzz: 'fizzbuzz'
      });
      expect(result).toEqual(specialObject);
    });

    it('Can return a matching CustomObject for an input that has null and undefined values', () => {
      const specialObject: CustomObject = {
        foo: CustomObjectMatchType.Full,
        bar: CustomObjectMatchType.Ignore
      };
      const checker = new CustomObjectChecker([specialObject]);
      const result = checker.getMatchingCustomObject({
        foo: null,
        bar: undefined
      });
      expect(result).toEqual(specialObject);
    });

    it('Can return a matching CustomObject for an input that has array values', () => {
      const specialObject: CustomObject = {
        foo: CustomObjectMatchType.Shallow,
        bar: CustomObjectMatchType.Shallow
      };
      const checker = new CustomObjectChecker([specialObject]);
      const result = checker.getMatchingCustomObject({
        foo: ['fizz'],
        bar: ['buzz']
      });
      expect(result).toEqual(specialObject);
    });

    it('Can return a matching CustomObject for an input that has object values', () => {
      const specialObject: CustomObject = {
        foo: CustomObjectMatchType.Shallow,
        bar: CustomObjectMatchType.Shallow
      };
      const checker = new CustomObjectChecker([specialObject]);
      const result = checker.getMatchingCustomObject({
        foo: {
          bim: 'bam'
        },
        bar: 'buzz'
      });
      expect(result).toEqual(specialObject);
    });

    it('Can return the matching CustomObject when configured with a string key value', () => {
      const specialObject: CustomObject = {
        foo: CustomObjectMatchType.Shallow,
        bar: 'foo'
      };
      const checker = new CustomObjectChecker([specialObject]);
      const result = checker.getMatchingCustomObject({
        foo: {
          bim: 'bam'
        },
        bar: {
          fizz: 'buzz'
        }
      });
      expect(result).toEqual(specialObject);
    });

    it('Can return a matching CustomObject when configured with multiple CustomObjects', () => {
      const specialObjects: CustomObject[] = [
        {
          foo: CustomObjectMatchType.Shallow,
          bar: CustomObjectMatchType.Shallow
        },
        {
          bim: CustomObjectMatchType.Shallow,
          bam: CustomObjectMatchType.Shallow
        }
      ];
      const checker = new CustomObjectChecker(specialObjects);
      const result1 = checker.getMatchingCustomObject({
        foo: 'fizz',
        bar: 'buzz'
      });
      expect(result1).toEqual(specialObjects[0]);

      const result2 = checker.getMatchingCustomObject({
        bim: 'fizz',
        bam: 'buzz'
      });
      expect(result2).toEqual(specialObjects[1]);

      const result3 = checker.getMatchingCustomObject({
        foo: 'fizz',
        bar: 'buzz',
        bim: 'bam'
      });
      expect(result3).toBeUndefined();
    });

    it('Does not return a CustomObject but functions correctly when configured with an empty list of CustomObjects', async () => {
      const emptyChecker = new CustomObjectChecker([]);
      const emptyCheckerResult = emptyChecker.getMatchingCustomObject({
        foo: 'fizz',
        bar: 'buzz'
      });
      expect(emptyCheckerResult).toBeUndefined();

      const undefinedChecker = new CustomObjectChecker();
      const undefinedCheckerResult = undefinedChecker.getMatchingCustomObject({
        foo: 'fizz',
        bar: 'buzz'
      });
      expect(undefinedCheckerResult).toBeUndefined();
    });

    it('Does not return a CustomObject if the input is null, undefined, array, or a primitive value', () => {
      const specialObject: CustomObject = {
        foo: CustomObjectMatchType.Shallow,
        bar: CustomObjectMatchType.Shallow
      };
      const checker = new CustomObjectChecker([specialObject]);
      const result1 = checker.getMatchingCustomObject(null);
      const result2 = checker.getMatchingCustomObject(undefined);
      const result3 = checker.getMatchingCustomObject([]);
      const result4 = checker.getMatchingCustomObject('foo');
      const result5 = checker.getMatchingCustomObject(123);
      expect(result1).toBeUndefined();
      expect(result2).toBeUndefined();
      expect(result3).toBeUndefined();
      expect(result4).toBeUndefined();
      expect(result5).toBeUndefined();
    });

    it('Does not return a CustomObject if the input has additional keys not in the CustomObject', () => {
      const specialObject: CustomObject = {
        foo: CustomObjectMatchType.Shallow,
        bar: CustomObjectMatchType.Shallow
      };
      const checker = new CustomObjectChecker([specialObject]);
      const result = checker.getMatchingCustomObject({
        foo: 'fizz',
        bar: 'buzz',
        bim: 'bam'
      });
      expect(result).toBeUndefined();
    });

    it('Does not return a CustomObject if the CustomObject has additional keys not in the value', () => {
      const specialObject: CustomObject = {
        foo: CustomObjectMatchType.Shallow,
        bar: CustomObjectMatchType.Shallow,
        bim: CustomObjectMatchType.Shallow
      };
      const checker = new CustomObjectChecker([specialObject]);
      const result = checker.getMatchingCustomObject({
        foo: 'fizz',
        bar: 'buzz'
      });
      expect(result).toBeUndefined();
    });

    it('Throws FieldRedactorConfigurationError when configured with two identical CustomObjects', () => {
      const cust1: CustomObject = {
        foo: CustomObjectMatchType.Shallow,
        bar: CustomObjectMatchType.Shallow
      };
      const cust2: CustomObject = {
        foo: CustomObjectMatchType.Shallow,
        bar: CustomObjectMatchType.Shallow
      };
      expect(() => new CustomObjectChecker([cust1, cust2])).toThrow(
        new FieldRedactorConfigurationError('Custom Objects at indexes 0 and 1 cannot have identical keys: foo,bar')
      );
    });

    it('Throws FieldRedactorConfigurationError when configured with two CustomObjects having matching keys', () => {
      const cust1: CustomObject = {
        foo: CustomObjectMatchType.Shallow,
        bar: CustomObjectMatchType.Shallow
      };
      const cust2: CustomObject = {
        foo: CustomObjectMatchType.Shallow,
        bar: 'foo'
      };
      expect(() => new CustomObjectChecker([cust1, cust2])).toThrow(
        new FieldRedactorConfigurationError(`Custom Objects at indexes 0 and 1 cannot have identical keys: foo,bar`)
      );
    });

    it('Throws FieldRedactorConfigurationError when configured with CustomObjects having matching keys in a large set', () => {
      const cust1: CustomObject = {
        foo: CustomObjectMatchType.Shallow,
        bar: CustomObjectMatchType.Shallow
      };
      const cust2: CustomObject = {
        fizz: CustomObjectMatchType.Shallow,
        buz: CustomObjectMatchType.Shallow
      };
      const cust3: CustomObject = {
        foo: CustomObjectMatchType.Shallow,
        bam: CustomObjectMatchType.Shallow
      };
      const cust4: CustomObject = {
        foo: CustomObjectMatchType.Shallow,
        bar: CustomObjectMatchType.Shallow
      };
      expect(() => new CustomObjectChecker([cust1, cust2, cust3, cust4])).toThrow(
        new FieldRedactorConfigurationError(`Custom Objects at indexes 0 and 3 cannot have identical keys: foo,bar`)
      );
    });

    it('Does not throw FieldRedactorConfigurationError when configured with a CustomObject that is a superset of another CustomObject', () => {
      const cust1: CustomObject = {
        foo: CustomObjectMatchType.Shallow,
        bar: CustomObjectMatchType.Shallow
      };
      const cust2: CustomObject = {
        foo: CustomObjectMatchType.Shallow,
        bar: CustomObjectMatchType.Shallow,
        fizz: CustomObjectMatchType.Shallow
      };
      expect(() => new CustomObjectChecker([cust1, cust2])).not.toThrow();
    });
  });
});
