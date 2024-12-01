import { Redactor } from './redactor';
import { SecretManager } from './secretManager';
import { CustomObject } from './types';

export class CustomObjectRedactor {
  private customObjects: CustomObject[] = [];
  private redactNullOrUndefined: boolean = false;

  constructor(
    private readonly secretManager: SecretManager,
    private readonly redactor: Redactor
  ) {}

  public setCustomObjects(customObjects: CustomObject[]): void {
    this.customObjects = customObjects;
  }

  public setRedactNullOrUndefined(redactNullOrUndefined: boolean): void {
    this.redactNullOrUndefined = redactNullOrUndefined;
  }

  public redactCustomObjectInPlace(value: any, customObject: CustomObject): void {
    for (const key of Object.keys(customObject)) {
      if (typeof customObject[key] === 'object') {
        this.redactCustomObjectInPlace(value[key], customObject[key]);
      } else if (typeof customObject[key] === 'boolean' && customObject[key] === true) {
        value[key] = this.redactValue(value[key]);
      } else if (
        typeof customObject[key] === 'string' &&
        !!value[customObject[key]] &&
        this.secretManager.isSecretKey(value[customObject[key]])
      ) {
        value[key] = this.redactor(value[key]);
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

    for (const key of Object.keys(value)) {
      if (!customObject.hasOwnProperty(key)) {
        return false;
      } else if (Array.isArray(value[key])) {
        continue;
      } else if (value[key] && typeof value[key] === 'object') {
        if (typeof customObject[key] !== 'object') {
          return false;
        }
        const nestedCustomObjectIsValid = this.isCustomObject(value[key], customObject[key]);
        if (!nestedCustomObjectIsValid) {
          return false;
        }
      }
    }

    return true;
  }
}
