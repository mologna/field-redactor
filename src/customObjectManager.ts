import { FieldRedactorConfigurationError } from './errors';
import { CustomObject, JsonObject } from './types';

/**
 * Utility for determining if a given object matches a CustomObject schema.
 * A value matches when it contains every key defined in the schema; additional keys on the value are allowed.
 * When multiple schemas match, the schema with the most keys is selected.
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
   * When multiple schemas match, returns the schema with the most keys.
   * @param value The value to compare against the custom objects.
   * @returns The most specific matching custom object, otherwise undefined.
   */
  public getMatchingCustomObject(value: unknown): CustomObject | undefined {
    let bestMatch: CustomObject | undefined;
    let bestMatchKeyCount = -1;

    for (const customObject of this.customObjects) {
      if (this.isCustomObject(value, customObject)) {
        const keyCount = Object.keys(customObject).length;
        if (keyCount > bestMatchKeyCount) {
          bestMatch = customObject;
          bestMatchKeyCount = keyCount;
        }
      }
    }

    return bestMatch;
  }

  private isCustomObject(value: unknown, customObject: CustomObject): value is JsonObject {
    if (typeof value !== 'object' || !value || Array.isArray(value)) {
      return false;
    }

    return Object.keys(customObject).every((key) => Object.prototype.hasOwnProperty.call(value, key));
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
