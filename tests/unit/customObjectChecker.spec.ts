import { CustomObjectChecker } from '../../src/customObjectChecker';
import { CustomObject } from '../../src/types';

describe('CustomObjectChecker', () => {
  it('getMatchingSpecialObject Can determine a special object with only one level', () => {
    const specialObject: CustomObject = {
      foo: true,
      bar: false
    };
    const checker = new CustomObjectChecker([specialObject]);
    const result = checker.getMatchingCustomObject({
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
    const checker = new CustomObjectChecker([specialObject]);
    const result = checker.getMatchingCustomObject({
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
    const checker = new CustomObjectChecker([specialObject]);
    const result = checker.getMatchingCustomObject({
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
      foo: true,
      bar: false,
      bim: true
    };
    const checker = new CustomObjectChecker([specialObject]);
    const result = checker.getMatchingCustomObject({
      foo: 'fizz',
      bar: 'buzz'
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
    const checker = new CustomObjectChecker([specialObject]);
    const result = checker.getMatchingCustomObject({
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
    const checker = new CustomObjectChecker([specialObject]);
    const result = checker.getMatchingCustomObject({
      foo: { bar: { baz: 'fizz', bim: 'false' } }
    });
    expect(result).toEqual(specialObject);
  });

  it('getMatchingSpecialObject Does not consider null, undefined, array, or non-object values special objects', () => {
    const specialObject: CustomObject = {
      foo: true,
      bar: false
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
        foo: true,
        bar: false
      },
      {
        bim: true,
        bam: true
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
