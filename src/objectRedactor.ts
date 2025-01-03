import { CustomObject, CustomObjectMatchType } from './types';
import { SecretManager } from './secretManager';
import { CustomObjectChecker } from './customObjectChecker';
import { PrimitiveRedactor } from './primitiveRedactor';

export class ObjectRedactor {
  constructor(
    private readonly primitiveRedactor: PrimitiveRedactor,
    private readonly secretManager: SecretManager,
    private readonly checker: CustomObjectChecker
  ) {}

  public async redactInPlace(value: any): Promise<any> {
    const customObject = this.checker.getMatchingCustomObject(value);
    if (customObject) {
      await this.redactCustomObject(value, customObject);
    } else {
      await this.redactSecretObjectFields(value);
    }

    return value;
  }

  private async redactSecretObjectFields(object: any, forceDeepRedaction: boolean = false): Promise<void> {
    for (const key of Object.keys(object)) {
      const value: any = object[key];
      if (this.secretManager.isFullSecretKey(key)) {
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
        const customObject = this.checker.getMatchingCustomObject(value);
        if (customObject) {
          await this.redactCustomObject(value, customObject);
          return value;
        } else {
          await this.redactSecretObjectFields(value, false);
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
        const customObject = this.checker.getMatchingCustomObject(value);
        if (customObject) {
          await this.redactCustomObject(value, customObject);
          return Promise.resolve(value);
        } else {
          await this.redactSecretObjectFields(value, forceDeepRedaction);
          return Promise.resolve(value);
        }
      }
    });

    return Promise.all(promises);
  }

  private async redactObjectInObject(value: any, key: string, forceDeepRedaction: boolean) {
    const customObject = this.checker.getMatchingCustomObject(value);
    if (customObject) {
      await this.redactCustomObject(value, customObject);
    } else {
      const secretObject = forceDeepRedaction || this.secretManager.isDeepSecretKey(key);
      await this.redactSecretObjectFields(value, secretObject);
    }
  }

  private async redactCustomObject(value: any, customObject: CustomObject): Promise<void> {
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

  private async handleCustomObjectArrayValueIfStringKeySpecified(value: any, key: string, stringKey: string) {
    if (this.secretManager.isFullSecretKey(stringKey)) {
      value[key] = await this.primitiveRedactor.redactValue(this.getStringValue(value[key]));
    }

    const isDeepSecretKey = this.secretManager.isDeepSecretKey(stringKey);
    if (isDeepSecretKey || this.secretManager.isSecretKey(stringKey)) {
      value[key] = await this.redactAllArrayValues(value[key], isDeepSecretKey);
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

  private async handleCustomObjectArrayValueIfMatchTypeSpecified(
    value: any,
    key: string,
    matchType: CustomObjectMatchType
  ) {
    switch (matchType) {
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

  private async handleCustomObjectObjectValueIfStringKeySpecified(value: any, key: string, stringKey: string) {
    if (this.secretManager.isFullSecretKey(stringKey)) {
      value[key] = await this.primitiveRedactor.redactValue(this.getStringValue(value[key]));
    } else if (this.secretManager.isDeepSecretKey(stringKey)) {
      await this.redactSecretObjectFields(value[key], true);
    } else if (this.secretManager.isSecretKey(stringKey)) {
      await this.redactSecretObjectFields(value[key], false);
    }
  }

  private async handleCustomObjectOjectValueIfMatchTypeSpecified(
    value: any,
    key: string,
    matchType: CustomObjectMatchType
  ) {
    switch (matchType) {
      case CustomObjectMatchType.Full:
        value[key] = await this.primitiveRedactor.redactValue(this.getStringValue(value[key]));
        return Promise.resolve();
      case CustomObjectMatchType.Deep:
        return this.redactSecretObjectFields(value[key], true);
      case CustomObjectMatchType.Shallow:
      case CustomObjectMatchType.Pass:
        return this.redactSecretObjectFields(value[key], false);
      case CustomObjectMatchType.Ignore:
        return Promise.resolve();
    }
  }

  private async handleCustomObjectValueIfPrimitive(value: any, customObject: CustomObject, key: string) {
    if (typeof customObject[key] === 'number') {
      value[key] = await this.handleCustomObjectPrimitiveValueIfMatchTypeSpecified(value[key], customObject[key]);
    } else {
      value[key] = await this.handleCustomObjectPrimitiveValueIfStringKeySpecified(value, customObject, key);
    }
  }

  private async handleCustomObjectPrimitiveValueIfMatchTypeSpecified(
    value: any,
    matchValue: CustomObjectMatchType | boolean
  ): Promise<any> {
    switch (matchValue) {
      case CustomObjectMatchType.Full:
        return this.primitiveRedactor.redactValue(this.getStringValue(value));
      case CustomObjectMatchType.Deep:
      case CustomObjectMatchType.Shallow:
        return this.primitiveRedactor.redactValue(value);
      case CustomObjectMatchType.Pass:
      default:
        return Promise.resolve(value);
    }
  }

  private async handleCustomObjectPrimitiveValueIfStringKeySpecified(
    value: any,
    customObject: CustomObject,
    key: string
  ) {
    const secretKey = this.getStringSpecifiedCustomObjectSecretKeyValueIfExists(value, customObject, key);
    if (!secretKey) {
      return value[key];
    }

    return this.redactPrimitiveValueIfSecret(secretKey, value[key], false);
  }

  private getStringSpecifiedCustomObjectSecretKeyValueIfExists(
    value: any,
    customObject: CustomObject,
    key: string
  ): string | null {
    const hasSecretKey = typeof customObject[key] === 'string' && !!value[customObject[key]];
    return hasSecretKey ? value[customObject[key]] : null;
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
