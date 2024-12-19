import { CustomObject, FieldRedactorConfig, Redactor } from './types';
import { SecretManager } from './secretManager';
import { CustomObjectChecker } from './customObjectChecker';

export class ObjectRedactor {
  private static DEFAULT_REDACTED_TEXT = 'REDACTED';
  private secretManager: SecretManager;
  private redactNullOrUndefined: boolean;
  private redactor: Redactor;
  private checker: CustomObjectChecker;
  private readonly ignoreBooleans: boolean = false;
  private readonly ignoreDates: boolean = false;
  constructor(config?: FieldRedactorConfig) {
    this.redactNullOrUndefined = config?.redactNullOrUndefined || false;
    this.secretManager = new SecretManager({
      secretKeys: config?.secretKeys,
      deepSecretKeys: config?.deepSecretKeys,
      fullSecretKeys: config?.fullSecretKeys
    });
    const replacementText = config?.replacementText || ObjectRedactor.DEFAULT_REDACTED_TEXT;
    this.redactor = config?.redactor || ((val: any) => Promise.resolve(replacementText));
    this.checker = new CustomObjectChecker(config?.customObjects);
    this.ignoreBooleans = config?.ignoreBooleans || false;
    this.ignoreDates = config?.ignoreDates || false;
  }

  public async redactInPlace(value: any): Promise<any> {
    const customObject = this.checker.getMatchingCustomObject(value);
    if (customObject) {
      await this.redactCustomObjectInPlace(value, customObject);
    } else {
      await this.redactObjectFieldsInPlace(value);
    }

    return value;
  }

  private async redactObjectFieldsInPlace(object: any, forceDeepRedaction: boolean = false): Promise<void> {
    for (const key of Object.keys(object)) {
      const value: any = object[key];
      if (this.secretManager.isFullSecretKey(key)) {
        object[key] = await this.redactValue(JSON.stringify(value));
      } else if (!this.isObject(object[key])) {
        object[key] = await this.redactFields(key, value, forceDeepRedaction, false);
      } else {
        const customObject = this.checker.getMatchingCustomObject(value);
        if (customObject) {
          await this.redactCustomObjectInPlace(value, customObject);
        } else {
          const secretObject = forceDeepRedaction || this.secretManager.isDeepSecretKey(key);
          await this.redactObjectFieldsInPlace(value, secretObject);
        }
      }
    }
  }

  private async redactArrayFieldsInPlace(key: string, array: any[], forceDeepRedaction: boolean, forceShallowRedaction: boolean): Promise<any[]> {
    const promises: Promise<any>[] = array.map(async (value) => {
      if (!this.isObject(value)) {
        return this.redactFields(key, value, forceDeepRedaction, forceShallowRedaction);
      } else {
        const customObject = this.checker.getMatchingCustomObject(value);
        if (customObject) {
          await this.redactCustomObjectInPlace(value, customObject);
          return Promise.resolve(value);
        } else {
          const secretObject = forceDeepRedaction || this.secretManager.isDeepSecretKey(key);
          await this.redactObjectFieldsInPlace(value, secretObject);
          return Promise.resolve(value);
        }
      }
    });

    return Promise.all(promises);
  }

  public async redactCustomObjectInPlace(value: any, customObject: CustomObject): Promise<void> {
    for (const key of Object.keys(customObject)) {
      if (this.isObject(value[key])) {
        this.redactObjectFieldsInPlace(value[key]);
      } else if (typeof customObject[key] === 'boolean' && customObject[key] === true) {
        value[key] = await this.redactFields(key, value[key], false, true);
      } else if (
        typeof customObject[key] === 'string' &&
        !!value[customObject[key]] &&
        this.secretManager.isSecretKey(value[customObject[key]])
      ) {
        value[key] = await this.redactFields(key, value[key], false, true);
      }
    }
  }

  private isObject(value: any) {
    return !!value && typeof value === 'object' && !(value instanceof Date) && !Array.isArray(value);
  }

  private async redactFields(key: string, value: any, forceDeepRedaction: boolean, forceShallowRedaction: boolean): Promise<any> {
    if (!value) {
      return this.redactNullOrUndefinedValue(key, value, forceDeepRedaction);
    } else if (Array.isArray(value)) {
      return this.redactArrayFieldsInPlace(key, value, forceDeepRedaction, forceShallowRedaction);
    } else {
      return this.redactObjectFieldIfSecret(key, value, forceDeepRedaction || forceShallowRedaction);
    }
  }

  private async redactObjectFieldIfSecret(key: string, value: any, forceRedaction: boolean): Promise<any> {
    if (forceRedaction || this.secretManager.isSecretKey(key)) {
      return this.redactValue(value);
    }

    return value;
  }

  private async redactValue(value: any) {
    if (typeof value === 'boolean') {
      return this.redactBoolean(value);
    } else if (value instanceof Date) {
      return this.redactDate(value);
    }

    return this.redactAny(value);
  }

  private async redactNullOrUndefinedValue(
    key: string,
    value: null | undefined,
    forceRedaction: boolean
  ): Promise<null | undefined | string> {
    if (!this.redactNullOrUndefined) {
      return Promise.resolve(value);
    } else if (forceRedaction || this.secretManager.isSecretKey(key)) {
      return this.redactor(value);
    }

    return Promise.resolve(value);
  }

  private async redactBoolean(value: boolean): Promise<boolean | string> {
    return this.ignoreBooleans ? Promise.resolve(value) : this.redactor(value);
  }

  private async redactDate(value: Date): Promise<Date | string> {
    return this.ignoreDates ? Promise.resolve(value) : this.redactor(value);
  }

  private async redactAny(value: any): Promise<string> {
    return this.redactor(value);
  }
}
