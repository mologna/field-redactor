import { SpecialObject } from "../FieldRedactor/config";

export const getMatchingSpecialObject = (value: any, specialObjects: SpecialObject[]): SpecialObject | undefined => {
  for (const specialObject of specialObjects) {
    if (isSpecialObject(value, specialObject)) {
      return specialObject;
    }
  }
  return undefined;
};

export const isSpecialObject = (value: any, specialObject: SpecialObject): value is SpecialObject => {
  if (typeof value !== 'object' || !value || Array.isArray(value)) {
    return false;
  }

  for (const key of Object.keys(value)) {
    if (!specialObject.hasOwnProperty(key)) {
      return false;
    } else if (typeof value[key] === 'object') {
      if (typeof specialObject[key] !== 'object') {
        return false;
      }
      const nestedSpecialObjectIsValid = isSpecialObject(value[key], specialObject[key]);
      if (!nestedSpecialObjectIsValid) {
        return false;
      }
    }
  }

  return true;
}