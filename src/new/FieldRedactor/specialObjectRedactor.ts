import { Redactor } from "../redactor/redactor";
import { SpecialObject } from "./config";

export class SpecialObjectRedactor {
  private specialObjects: SpecialObject[] = [];
  private redactNullOrUndefined: boolean = false;

  constructor(
    private readonly redactor: Redactor) {
  }

  public setSpecialObjects(specialObjects: SpecialObject[]): void {
    this.specialObjects = specialObjects;
  }

  public setRedactNullOrUndefined(redactNullOrUndefined: boolean): void {
    this.redactNullOrUndefined = redactNullOrUndefined;
  };

  public redactInPlaceIfSpecialObject(value: any): boolean {
    const specialObject: SpecialObject | undefined = this.getMatchingSpecialObject(value);
    if (!specialObject) {
      return false;
    }

    this.doRedactInPlaceIfSpecialObject(value, specialObject);
    return true;
  }

  private doRedactInPlaceIfSpecialObject(value: any, specialObject: SpecialObject): void {
    for (const key of Object.keys(specialObject)) {
      if (typeof specialObject[key] === 'object') {
        this.doRedactInPlaceIfSpecialObject(value[key], specialObject[key]);
      } else if (specialObject[key] === true ) {
        value[key] = this.redactValue(value[key]);
      }
    }
  }

  private redactValue(value: any): any {
    if (value === null || value === undefined) {
      return this.redactNullOrUndefined ? this.redactor(value) : value;
    } else if (Array.isArray(value)) {
      return value.map((element) => this.redactValue(element));
    } else {
      return this.redactor(value);
    }
  }

  public getMatchingSpecialObject(value: any): SpecialObject | undefined {
    for (const specialObject of this.specialObjects) {
      if (this.isSpecialObject(value, specialObject)) {
        return specialObject;
      }
    }
    return undefined;
  };
  
  private isSpecialObject(value: any, specialObject: SpecialObject): boolean {
    if (typeof value !== 'object' || !value || Array.isArray(value)) {
      return false;
    }
  
    for (const key of Object.keys(value)) {
      if (!specialObject.hasOwnProperty(key)) {
        return false;
      } else if (Array.isArray(value[key])) {
        continue;
      } else if (value[key] && typeof value[key] === 'object') {
        if (typeof specialObject[key] !== 'object') {
          return false;
        }
        const nestedSpecialObjectIsValid = this.isSpecialObject(value[key], specialObject[key]);
        if (!nestedSpecialObjectIsValid) {
          return false;
        }
      }
    }
  
    return true;
  }
}