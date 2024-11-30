import { SpecialObject } from "../../../src/new/FieldRedactor/config";
import { getMatchingSpecialObject, isSpecialObject } from "../../../src/new/utils/isSpecialObject";

describe('NewUtils', () => {
  describe('isSpecialObject', () => {
    it('Can determine a special object with only one level', () => {
      const specialObject: SpecialObject = {
        foo: true,
        bar: false
      };
      const result = isSpecialObject({foo: "fizz", bar: "buzz"}, specialObject);
      expect(result).toBeTruthy();
    });
  
    it('Does not consider an object a special object if it has extra keys despite matching everywhere else', () => {
      const specialObject: SpecialObject = {
        foo: true,
        bar: false
      };
      const result = isSpecialObject({foo: "fizz", bar: "buzz", bim: "bam"}, specialObject);
      expect(result).toBeFalsy();
    });
  
    it('Can handle nested special objects one deep', () => {
      const specialObject: SpecialObject = {
        foo: {
          bar: true,
          baz: false
        }
      };
      const result = isSpecialObject({foo: {bar: "fizz", baz: "buzz"}}, specialObject);
      expect(result).toBeTruthy();
    });

    it('Can handle nested special objects multiple layers deep', () => {
      const specialObject: SpecialObject = {
        foo: {
          bar: {
            baz: true,
            bim: false
          }
        }
      };
      const result = isSpecialObject({foo: {bar: {baz: "fizz", bim: "false"}}}, specialObject);
      expect(result).toBeTruthy();
    });

    it('Does not consider null, undefined, array, or non-object values special objects', () => {
      const specialObject: SpecialObject = {
        foo: true,
        bar: false
      };
      const result1 = isSpecialObject(null, specialObject);
      const result2 = isSpecialObject(undefined, specialObject);
      const result3 = isSpecialObject([], specialObject);
      const result4 = isSpecialObject("foo", specialObject);
      const result5 = isSpecialObject(123, specialObject);
      expect(result1).toBeFalsy();
      expect(result2).toBeFalsy();
      expect(result3).toBeFalsy();
      expect(result4).toBeFalsy();
      expect(result5).toBeFalsy();
    });
  });

  describe('getMatchingSpecialObject', () => {
    it('Can find a matching special object', () => {
      const specialObjects: SpecialObject[] = [
        {
          foo: true,
          bar: false,
        },
        {
          bim: true,
          bam: true
        }
      ];

      const result1 = getMatchingSpecialObject({foo: "fizz", bar: "buzz"}, specialObjects);
      expect(result1).toEqual(specialObjects[0]);

      const result2 = getMatchingSpecialObject({bim: "fizz", bam: "buzz"}, specialObjects);
      expect(result2).toEqual(specialObjects[1]);

      const result3 = getMatchingSpecialObject({foo: "fizz", bar: "buzz", bim: "bam"}, specialObjects);
      expect(result3).toBeUndefined();
    });
  });
});