import { CustomObject, FieldRedactorConfig } from './types';
import { SecretManager } from './secretManager';
import { CustomObjectChecker } from './customObjectChecker';
import { PrimitiveRedactor } from './primitiveRedactor';

export class ObjectRedactor {
  private secretManager: SecretManager;
  private primitiveRedactor: PrimitiveRedactor;
  private checker: CustomObjectChecker;
  constructor(config?: FieldRedactorConfig) {
    console.log(config?.ignoreNullOrUndefined);
    this.primitiveRedactor = new PrimitiveRedactor({
      redactor: config?.redactor,
      ignoreBooleans: config?.ignoreBooleans,
      ignoreDates: config?.ignoreDates,
      ignoreNullOrUndefined: config?.ignoreNullOrUndefined
    });
    this.secretManager = new SecretManager({
      secretKeys: config?.secretKeys,
      deepSecretKeys: config?.deepSecretKeys,
      fullSecretKeys: config?.fullSecretKeys
    });
    this.checker = new CustomObjectChecker(config?.customObjects);
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
        object[key] = await this.primitiveRedactor.redactValue(JSON.stringify(value));
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
    console.log(object);
  }

  private async redactArrayFieldsInPlace(
    key: string,
    array: any[],
    forceDeepRedaction: boolean,
    forceShallowRedaction: boolean
  ): Promise<any[]> {
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
        value[key] = await this.redactFields(value[customObject[key]], value[key], false, true);
      }
    }
  }

  private isObject(value: any) {
    return !!value && typeof value === 'object' && !(value instanceof Date) && !Array.isArray(value);
  }

  private async redactFields(
    key: string,
    value: any,
    forceDeepRedaction: boolean,
    forceShallowRedaction: boolean
  ): Promise<any> {
    if (Array.isArray(value)) {
      return this.redactArrayFieldsInPlace(key, value, forceDeepRedaction, forceShallowRedaction);
    } else {
      return this.redactObjectFieldIfSecret(key, value, forceDeepRedaction, forceShallowRedaction);
    }
  }

  private async redactObjectFieldIfSecret(
    key: string,
    value: any,
    forceDeepRedactin: boolean,
    forceShallowRedaction: boolean
  ): Promise<any> {
    if (forceShallowRedaction) {
      return this.primitiveRedactor.redactValue(value);
    } else if (forceDeepRedactin || this.secretManager.isSecretKey(key)) {
      const result = await this.primitiveRedactor.redactValue(value);
      return result;
    } else {
      return value;
    }
  }
}
