import { CustomObjectChecker } from '../../src/customObjectChecker';
import { CustomObject, CustomObjectMatchType } from '../../src/types';

describe('CustomObjectChecker', () => {
  it('getMatchingSpecialObject Can determine a special object with all types', () => {
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

  it('Can handle null and undefined field values', () => {
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

  it('Can handle array field values', () => {
    const specialObject: CustomObject = {
      foo: CustomObjectMatchType.Shallow,
      bar: CustomObjectMatchType.Shallow,
    };
    const checker = new CustomObjectChecker([specialObject]);
    const result = checker.getMatchingCustomObject({
      foo: ['fizz'],
      bar: ['buzz']
    });
    expect(result).toEqual(specialObject);
  });

  it('getMatchingSpecialObject Does not consider an object a special object if it has extra keys despite matching everywhere else', () => {
    const specialObject: CustomObject = {
      foo: CustomObjectMatchType.Shallow,
      bar: CustomObjectMatchType.Shallow,
    };
    const checker = new CustomObjectChecker([specialObject]);
    const result = checker.getMatchingCustomObject({
      foo: 'fizz',
      bar: 'buzz',
      bim: 'bam'
    });
    expect(result).toBeUndefined();
  });

  it('getMatchingSpecialObject Does not consider an object a special object if the special object has extra keys despite matching everywhere else', () => {
    const specialObject: CustomObject = {
      foo: CustomObjectMatchType.Shallow,
      bar: CustomObjectMatchType.Shallow,
      bim: CustomObjectMatchType.Shallow,
    };
    const checker = new CustomObjectChecker([specialObject]);
    const result = checker.getMatchingCustomObject({
      foo: 'fizz',
      bar: 'buzz'
    });
    expect(result).toBeUndefined();
  });

  it('getMatchingSpecialObject considers values which are objects to still be a match', () => {
    const specialObject: CustomObject = {
      foo: CustomObjectMatchType.Shallow,
      bar: CustomObjectMatchType.Shallow,
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

  it('getMatchingSpecialObject considers values which are objects to still be a match for string matches', () => {
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

  it('getMatchingSpecialObject Does not consider null, undefined, array, or non-object values special objects', () => {
    const specialObject: CustomObject = {
      foo: CustomObjectMatchType.Shallow,
      bar: CustomObjectMatchType.Shallow,
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

  it('Can find a matching special object in a list of special objects', () => {
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

  it('Can handle an empty list of special objects', async () => {
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
});
