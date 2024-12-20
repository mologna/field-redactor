import { CustomObject } from './types';

export class CustomObjectChecker {
  private customObjects: CustomObject[] = [];

  constructor(customObjects?: CustomObject[]) {
    this.customObjects = customObjects ? customObjects : [];
  }

  public getMatchingCustomObject(value: any): CustomObject | undefined {
    for (const customObject of this.customObjects) {
      if (this.isCustomObject(value, customObject)) {
        return customObject;
      }
    }
    return undefined;
  }

  private isCustomObject(value: any, customObject: CustomObject): boolean {
    if (typeof value !== 'object' || !value || Array.isArray(value)) {
      return false;
    }

    if (!this.customObjectDoesNotHaveExtraKeys(value, customObject)) {
      return false;
    }

    for (const key of Object.keys(value)) {
      if (!customObject.hasOwnProperty(key)) {
        return false;
      }
    }

    return true;
  }

  private customObjectDoesNotHaveExtraKeys(value: any, customObject: CustomObject): boolean {
    for (const key of Object.keys(customObject)) {
      if (!value.hasOwnProperty(key)) {
        return false;
      }
    }

    return true;
  }
}
