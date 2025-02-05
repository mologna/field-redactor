import { CustomObject, CustomObjectMatchType } from './types';
import { SecretManager } from './secretManager';
import { CustomObjectManager } from './customObjectManager';
import { PrimitiveRedactor } from './primitiveRedactor';

/**
 * Redacts fields in a JSON object using the secretManager, primitiveRedactor, and CustomObjectChecker provided in the
 * constructor. The redaction is done in place and the redacted object is returned. CustomObjects take highest precedence,
 * followed by fullSecretKeys, then deepSecretKeys, and finally secretKeys. If a field is an object or an array it is
 * assessed recursively unless otherwise configured by a CustomObject or deepSecretKey.
 */
export class ObjectRedactor {
  constructor(
    private readonly primitiveRedactor: PrimitiveRedactor,
    private readonly secretManager: SecretManager,
    private readonly customObjManager: CustomObjectManager
  ) {}

  /**
   * Conditionally redacts fields in the JSON object in place based on the configuration using the
   * primitive redactor, custom object checker, and secret manager provided in the constructor.
   * @param value The JSON value to redact in place.
   * @returns The JSON value provided in the argument.
   */
  public async redactInPlace(value: any): Promise<any> {
    const customObject = this.customObjManager.getMatchingCustomObject(value);
    if (customObject) {
      await this.handleCustomObjectInPlace(value, customObject);
    } else {
      await this.redactSecretObjectFieldsInPlace(value);
    }

    return value;
  }

  private async redactSecretObjectFieldsInPlace(object: any, forceDeepRedaction: boolean = false): Promise<void> {
    for (const key of Object.keys(object)) {
      const value: any = object[key];
      const customObject = this.customObjManager.getMatchingCustomObject(value);
      if (customObject) {
        await this.handleCustomObjectInPlace(value, customObject);
      } else if (this.secretManager.isDeleteSecretKey(key)) {
        delete object[key];
      } else if (this.secretManager.isFullSecretKey(key)) {
        object[key] = await this.primitiveRedactor.redactValue(this.getStringValue(value));
      } else if (Array.isArray(object[key])) {
        object[key] = await this.redactArrayInObject(value, key, forceDeepRedaction);
      } else if (this.isObject(object[key])) {
        await this.redactObjectInObject(object[key], key, forceDeepRedaction);
      } else {
        object[key] = await this.redactPrimitiveValueIfSecret(key, value, forceDeepRedaction);
      }
    }
  }

  private async redactArrayInObject(array: any[], key: string, forceDeepRedaction: boolean): Promise<any> {
    const deepSecretKey = this.secretManager.isDeepSecretKey(key);
    if (this.secretManager.isSecretKey(key) || deepSecretKey || forceDeepRedaction) {
      return this.redactAllArrayValues(array, forceDeepRedaction || deepSecretKey);
    } else {
      return await this.redactObjectsInArray(array);
    }
  }

  private async redactObjectsInArray(array: any[]): Promise<any[]> {
    const promises: Promise<any>[] = array.map(async (value: any) => {
      if (this.isObject(value)) {
        const customObject = this.customObjManager.getMatchingCustomObject(value);
        if (customObject) {
          await this.handleCustomObjectInPlace(value, customObject);
          return value;
        } else {
          await this.redactSecretObjectFieldsInPlace(value, false);
        }
      }

      return value;
    });

    return Promise.all(promises);
  }

  private async redactAllArrayValues(array: any[], forceDeepRedaction: boolean): Promise<any[]> {
    const promises: Promise<any>[] = array.map(async (value: any) => {
      if (Array.isArray(value)) {
        return this.redactAllArrayValues(value, forceDeepRedaction);
      } else if (!this.isObject(value)) {
        return this.primitiveRedactor.redactValue(value);
      } else {
        const customObject = this.customObjManager.getMatchingCustomObject(value);
        if (customObject) {
          await this.handleCustomObjectInPlace(value, customObject);
          return Promise.resolve(value);
        } else {
          await this.redactSecretObjectFieldsInPlace(value, forceDeepRedaction);
          return Promise.resolve(value);
        }
      }
    });

    return Promise.all(promises);
  }

  private async redactObjectInObject(value: any, key: string, forceDeepRedaction: boolean) {
    const customObject = this.customObjManager.getMatchingCustomObject(value);
    if (customObject) {
      await this.handleCustomObjectInPlace(value, customObject);
    } else {
      const secretObject = forceDeepRedaction || this.secretManager.isDeepSecretKey(key);
      await this.redactSecretObjectFieldsInPlace(value, secretObject);
    }
  }

  private async handleCustomObjectInPlace(value: any, customObject: CustomObject): Promise<void> {
    for (const key of Object.keys(customObject)) {
      if (Array.isArray(value[key])) {
        await this.handleCustomObjectValueIfArray(value, key, customObject);
      } else if (this.isObject(value[key])) {
        await this.handlecustomObjectValueIfObject(value, key, customObject);
      } else {
        await this.handleCustomObjectValueIfPrimitive(value, customObject, key);
      }
    }
  }

  private async handleCustomObjectValueIfArray(value: any, key: string, customObject: CustomObject) {
    const stringKey = this.getStringSpecifiedCustomObjectSecretKeyValueIfExists(value, customObject, key);
    if (stringKey) {
      await this.handleCustomObjectArrayValueIfStringKeySpecified(value, key, stringKey);
    } else {
      await this.handleCustomObjectArrayValueIfMatchTypeSpecified(
        value,
        key,
        customObject[key] as CustomObjectMatchType
      );
    }
  }

  private getStringSpecifiedCustomObjectSecretKeyValueIfExists(
    value: any,
    customObject: CustomObject,
    key: string
  ): string | null {
    const hasSecretKey = typeof customObject[key] === 'string' && !!value[customObject[key]];
    return hasSecretKey ? value[customObject[key]] : null;
  }

  private async handleCustomObjectArrayValueIfStringKeySpecified(value: any, key: string, stringKey: string) {
    if (this.secretManager.isDeleteSecretKey(stringKey)) {
      delete value[key];
    } else if (this.secretManager.isFullSecretKey(stringKey)) {
      value[key] = await this.primitiveRedactor.redactValue(this.getStringValue(value[key]));
    } else {
      const isDeepSecretKey = this.secretManager.isDeepSecretKey(stringKey);
      if (isDeepSecretKey || this.secretManager.isSecretKey(stringKey)) {
        value[key] = await this.redactAllArrayValues(value[key], isDeepSecretKey);
      }
    }
  }

  private async handleCustomObjectArrayValueIfMatchTypeSpecified(
    value: any,
    key: string,
    matchType: CustomObjectMatchType
  ) {
    switch (matchType) {
      case CustomObjectMatchType.Delete:
        delete value[key];
        return Promise.resolve();
      case CustomObjectMatchType.Full:
        value[key] = await this.primitiveRedactor.redactValue(this.getStringValue(value[key]));
        return Promise.resolve();
      case CustomObjectMatchType.Deep:
        value[key] = await this.redactAllArrayValues(value[key], true);
        return Promise.resolve();
      case CustomObjectMatchType.Shallow:
        value[key] = await this.redactAllArrayValues(value[key], false);
        return Promise.resolve();
      case CustomObjectMatchType.Pass:
        value[key] = await this.redactArrayInObject(value[key], key, false);
      default:
        return Promise.resolve();
    }
  }

  private async handlecustomObjectValueIfObject(value: any, key: string, customObject: CustomObject): Promise<void> {
    const stringKey = this.getStringSpecifiedCustomObjectSecretKeyValueIfExists(value, customObject, key);
    if (stringKey) {
      await this.handleCustomObjectObjectValueIfStringKeySpecified(value, key, stringKey);
    } else {
      await this.handleCustomObjectOjectValueIfMatchTypeSpecified(
        value,
        key,
        customObject[key] as CustomObjectMatchType
      );
    }
  }

  private async handleCustomObjectObjectValueIfStringKeySpecified(value: any, key: string, stringKey: string) {
    const customObject = this.customObjManager.getMatchingCustomObject(value[key]);
    if (customObject) {
      await this.handleCustomObjectInPlace(value[key], customObject);
    } else if (this.secretManager.isDeleteSecretKey(stringKey)) {
      delete value[key];
    } else if (this.secretManager.isFullSecretKey(stringKey)) {
      value[key] = await this.primitiveRedactor.redactValue(this.getStringValue(value[key]));
    } else if (this.secretManager.isDeepSecretKey(stringKey)) {
      await this.redactSecretObjectFieldsInPlace(value[key], true);
    } else if (this.secretManager.isSecretKey(stringKey)) {
      await this.redactSecretObjectFieldsInPlace(value[key], false);
    }
  }

  private async handleCustomObjectOjectValueIfMatchTypeSpecified(
    value: any,
    key: string,
    matchType: CustomObjectMatchType
  ) {
    switch (matchType) {
      case CustomObjectMatchType.Delete:
        delete value[key];
        return Promise.resolve();
      case CustomObjectMatchType.Full:
        value[key] = await this.primitiveRedactor.redactValue(this.getStringValue(value[key]));
        return Promise.resolve();
      case CustomObjectMatchType.Deep:
        return this.redactSecretObjectFieldsInPlace(value[key], true);
      case CustomObjectMatchType.Shallow:
      case CustomObjectMatchType.Pass:
        return this.redactSecretObjectFieldsInPlace(value[key], false);
      case CustomObjectMatchType.Ignore:
        return Promise.resolve();
    }
  }

  private async handleCustomObjectValueIfPrimitive(value: any, customObject: CustomObject, key: string) {
    if (typeof customObject[key] === 'number') {
      return this.handleCustomObjectPrimitiveValueIfMatchTypeSpecified(value, key, customObject[key]);
    } else {
      const secretKey = this.getStringSpecifiedCustomObjectSecretKeyValueIfExists(value, customObject, key);
      if (!secretKey) {
        return;
      }

      await this.handleCustomObjectPrimitiveValueIfStringKeySpecified(value, secretKey, key);
    }
  }

  private async handleCustomObjectPrimitiveValueIfMatchTypeSpecified(
    value: any,
    key: string,
    matchValue: CustomObjectMatchType | boolean
  ): Promise<void> {
    switch (matchValue) {
      case CustomObjectMatchType.Delete:
        delete value[key];
        return;
      case CustomObjectMatchType.Full:
        value[key] = await this.primitiveRedactor.redactValue(this.getStringValue(value[key]));
        return;
      case CustomObjectMatchType.Deep:
      case CustomObjectMatchType.Shallow:
        value[key] = await this.primitiveRedactor.redactValue(value[key]);
        return;
      case CustomObjectMatchType.Pass:
      default:
        return Promise.resolve();
    }
  }

  private async handleCustomObjectPrimitiveValueIfStringKeySpecified(value: any, secretKey: string, key: string) {
    if (this.secretManager.isDeleteSecretKey(secretKey)) {
      delete value[key];
    } else {
      value[key] = await this.redactPrimitiveValueIfSecret(secretKey, value[key], false);
    }
  }

  private getStringValue(val: any) {
    if (this.isObject(val) || Array.isArray(val)) {
      return JSON.stringify(val);
    } else if (val === null || val === undefined) {
      return val;
    } else {
      return val.toString();
    }
  }

  private isObject(value: any) {
    return !!value && typeof value === 'object' && !(value instanceof Date) && !Array.isArray(value);
  }

  private async redactPrimitiveValueIfSecret(key: string, value: any, forceDeepRedaction: boolean): Promise<any> {
    if (this.secretManager.isFullSecretKey(key)) {
      return this.primitiveRedactor.redactValue(this.getStringValue(value));
    } else if (forceDeepRedaction || this.secretManager.isSecretKey(key) || this.secretManager.isDeepSecretKey(key)) {
      return this.primitiveRedactor.redactValue(value);
    } else {
      return value;
    }
  }
}
