import { before } from "node:test";
import { SpecialObject } from "../../../src/new/FieldRedactor/config";
import { SpecialObjectRedactor } from "../../../src/new/FieldRedactor/specialObjectRedactor";
import { Redactor } from "../../../src/new/redactor/redactor";

describe('SpecialObjectRedactor', () => {
  const REDACTION_TEXT: string = "REDACTED";
  const mockRedactor: Redactor = () => REDACTION_TEXT;
  let specialObjectRedactor: SpecialObjectRedactor;

  beforeEach(() => {
    specialObjectRedactor = new SpecialObjectRedactor(mockRedactor);
  });

  describe('getMatchingSpecialObject', () => {
    it('getMatchingSpecialObject Can determine a special object with only one level', () => {
      const specialObject: SpecialObject = {
        foo: true,
        bar: false
      };
      specialObjectRedactor.setSpecialObjects([specialObject]);
      const result = specialObjectRedactor.getMatchingSpecialObject({foo: "fizz", bar: "buzz"});
      expect(result).toEqual(specialObject);
    });

    it('Can handle null and undefined field values', () => {
      const specialObject: SpecialObject = {
        foo: true,
        bar: false
      };
      specialObjectRedactor.setSpecialObjects([specialObject]);
      const result = specialObjectRedactor.getMatchingSpecialObject({foo: null, bar: undefined});
      expect(result).toEqual(specialObject);
    });

    it('Can handle array field values', () => {
      const specialObject: SpecialObject = {
        foo: true,
        bar: false
      };
      specialObjectRedactor.setSpecialObjects([specialObject]);
      const result = specialObjectRedactor.getMatchingSpecialObject({foo: ["fizz"], bar: ["buzz"]});
      expect(result).toEqual(specialObject);
    });
  
    it('getMatchingSpecialObject Does not consider an object a special object if it has extra keys despite matching everywhere else', () => {
      const specialObject: SpecialObject = {
        foo: true,
        bar: false
      };
      specialObjectRedactor.setSpecialObjects([specialObject]);
      const result = specialObjectRedactor.getMatchingSpecialObject({foo: "fizz", bar: "buzz", bim: "bam"});
      expect(result).toBeUndefined();
    });
  
    it('getMatchingSpecialObject Can handle nested special objects one deep', () => {
      const specialObject: SpecialObject = {
        foo: {
          bar: true,
          baz: false
        }
      };
      specialObjectRedactor.setSpecialObjects([specialObject]);
      const result = specialObjectRedactor.getMatchingSpecialObject({foo: {bar: "fizz", baz: "buzz"}});
      expect(result).toEqual(specialObject);
    });

    it('getMatchingSpecialObject Can handle nested special objects multiple layers deep', () => {
      const specialObject: SpecialObject = {
        foo: {
          bar: {
            baz: true,
            bim: false
          }
        }
      };
      specialObjectRedactor.setSpecialObjects([specialObject]);
      const result = specialObjectRedactor.getMatchingSpecialObject({foo: {bar: {baz: "fizz", bim: "false"}}});
      expect(result).toEqual(specialObject);
    });

    it('getMatchingSpecialObject Does not consider null, undefined, array, or non-object values special objects', () => {
      const specialObject: SpecialObject = {
        foo: true,
        bar: false
      };
    
      specialObjectRedactor.setSpecialObjects([specialObject]);
      const result1 = specialObjectRedactor.getMatchingSpecialObject(null);
      const result2 = specialObjectRedactor.getMatchingSpecialObject(undefined);
      const result3 = specialObjectRedactor.getMatchingSpecialObject([]);
      const result4 = specialObjectRedactor.getMatchingSpecialObject("foo");
      const result5 = specialObjectRedactor.getMatchingSpecialObject(123);
      expect(result1).toBeUndefined();
      expect(result2).toBeUndefined();
      expect(result3).toBeUndefined();
      expect(result4).toBeUndefined();
      expect(result5).toBeUndefined();
    });

    it('Can find a matching special object in a list of special objects', () => {
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
      specialObjectRedactor.setSpecialObjects(specialObjects);
      const result1 = specialObjectRedactor.getMatchingSpecialObject({foo: "fizz", bar: "buzz"});
      expect(result1).toEqual(specialObjects[0]);

      const result2 = specialObjectRedactor.getMatchingSpecialObject({bim: "fizz", bam: "buzz"});
      expect(result2).toEqual(specialObjects[1]);

      const result3 = specialObjectRedactor.getMatchingSpecialObject({foo: "fizz", bar: "buzz", bim: "bam"});
      expect(result3).toBeUndefined();
    });

    it('Can handle an empty list of special objects', () => {
      specialObjectRedactor.setSpecialObjects([]);
      const result = specialObjectRedactor.getMatchingSpecialObject({foo: "fizz", bar: "buzz"});
      expect(result).toBeUndefined();
    });
  });

  describe('redactSpecialObjectInPlace', () => {
    it('Redacts a special object in place', () => {
      const specialObject: SpecialObject = {
        foo: true,
        bar: false
      };
      const obj = {foo: "fizz", bar: "buzz"};
      specialObjectRedactor.redactSpecialObjectInPlace(obj, specialObject);
      expect(obj).toEqual({foo: REDACTION_TEXT, bar: "buzz"});
    });

    it('Redacts a nested special object in place', () => {
      const specialObject: SpecialObject = {
        foo: {
          bar: true,
          baz: false
        }
      };
      specialObjectRedactor.setSpecialObjects([specialObject]);
      const obj = {foo: {bar: "fizz", baz: "buzz"}};
      specialObjectRedactor.redactSpecialObjectInPlace(obj, specialObject);
      expect(obj).toEqual({foo: {bar: REDACTION_TEXT, baz: "buzz"}});
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
      specialObjectRedactor.setSpecialObjects([specialObject]);
      const obj = {foo: {bar: {baz: "fizz", bim: "buzz"}}};
      specialObjectRedactor.redactSpecialObjectInPlace(obj, specialObject);
      expect(obj).toEqual({foo: {bar: {baz: REDACTION_TEXT, bim: "buzz"}}});
    });

    it('Does not redact null, or undefined values by default', () => {
      const specialObject: SpecialObject = {
        foo: true,
        bar: true
      };
      specialObjectRedactor.setSpecialObjects([specialObject]);
      const obj = {foo: null, bar: undefined};
      specialObjectRedactor.redactSpecialObjectInPlace(obj, specialObject);
      expect(obj).toEqual({foo: null, bar: undefined});
    });

    it('Can redact null, or undefined values if specified', () => {
      const specialObject: SpecialObject = {
        foo: true,
        bar: true
      };
      specialObjectRedactor.setSpecialObjects([specialObject]);
      specialObjectRedactor.setRedactNullOrUndefined(true);
      const obj = {foo: null, bar: undefined};
      specialObjectRedactor.redactSpecialObjectInPlace(obj, specialObject);
      expect(obj).toEqual({foo: REDACTION_TEXT, bar: REDACTION_TEXT});
    });

    it('Can handle a special object where the value is an array', () => {
      const specialObject: SpecialObject = {
        foo: false,
        bar: true
      };
      specialObjectRedactor.setSpecialObjects([specialObject]);
      const obj = {foo: "bim", bar: ["fizz", "buzz"]};
      specialObjectRedactor.redactSpecialObjectInPlace(obj, specialObject);
      expect(obj.foo).toEqual("bim");
      expect(obj.bar).toStrictEqual([REDACTION_TEXT, REDACTION_TEXT]);
    });
  });
});