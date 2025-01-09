import { FieldRedactorConfigurationError } from './errors';
import { CustomObject } from './types';

/**
 * Utility for determining if a given object matches a CustomObject schema.
 */
export class CustomObjectManager {
  private customObjects: CustomObject[] = [];

  /**
   * Creates a CustomObjectChecker with the specified CustomObjects.
   * @param customObjects The CustomObjects to check against.
   */
  constructor(customObjects?: CustomObject[]) {
    this.validateCustomObjects(customObjects);
    this.customObjects = customObjects ? customObjects : [];
  }

  /**
   * Determines if the input value matches any of the custom objects provided in the constructor.
   * @param value The value to compare against the custom objects.
   * @returns A matching custom object if one exists, otherwise undefined.
   */
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

    return !this.objectHasExtraKeys(customObject, value) && !this.objectHasExtraKeys(value, customObject);
  }

  private objectHasExtraKeys(object: any, objectToCompareTo: any): boolean {
    return Object.keys(object).some((key) => !objectToCompareTo.hasOwnProperty(key));
  }

  private validateCustomObjects(customObjects?: CustomObject[]): void {
    if (!customObjects || customObjects.length <= 1) {
      return;
    }

    for (let i = 0; i < customObjects.length - 1; i++) {
      const current: CustomObject = customObjects[i];
      const keys = Object.keys(current);
      for (let j = i + 1; j < customObjects.length; j++) {
        const other: CustomObject = customObjects[j];
        const otherKeys = Object.keys(other);
        const commonKeys = keys.filter((key) => otherKeys.includes(key));
        if (commonKeys.length === keys.length && commonKeys.length === otherKeys.length) {
          throw new FieldRedactorConfigurationError(
            `Custom Objects at indexes ${i} and ${j} cannot have identical keys: ${commonKeys}`
          );
        }
      }
    }
  }
}
