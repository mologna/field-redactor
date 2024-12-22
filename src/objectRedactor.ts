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
      } else if (Array.isArray(object[key])) {
        object[key] = await this.redactArrayFieldsInPlace(key, object[key], forceDeepRedaction || this.secretManager.isDeepSecretKey(key));
      } else if (this.isObject(object[key])) {
        await this.redactObjectFieldObjectValueInPlace(object[key], key, forceDeepRedaction);
      } else {
        object[key] = await this.redactPrimitiveValueIfSecret(key, value, forceDeepRedaction);
      }
    }
  }

  private async redactObjectFieldObjectValueInPlace(value: any, key: string, forceDeepRedaction: boolean) {
    const customObject = this.checker.getMatchingCustomObject(value);
    if (customObject) {
      await this.redactCustomObjectInPlace(value, customObject);
    } else {
      const secretObject = forceDeepRedaction || this.secretManager.isDeepSecretKey(key);
      await this.redactObjectFieldsInPlace(value, secretObject);
    }
  }

  private async redactArrayFieldsInPlace(
    key: string,
    array: any[],
    forceDeepRedaction: boolean
  ): Promise<any[]> {
    const promises: Promise<any>[] = array.map(async (value) => {
      if (Array.isArray(value)) {
        return this.redactArrayFieldsInPlace(key, value, forceDeepRedaction);
      } else if (!this.isObject(value)) {
        return this.redactPrimitiveValueIfSecret(key, value, forceDeepRedaction);
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
      if (this.isObject(value[key]) || Array.isArray(value[key])) {
        await this.handleCustomObjectValueIfObjectOrArray(value, key, customObject);
      } else {
        await this.handleCustomObjectValueIfPrimitive(value, customObject, key);
      }
    }
  }

  private async handleCustomObjectValueIfObjectOrArray(
    value: any,
    key: string,
    customObject: CustomObject
  ): Promise<void> {
    const stringKey = this.getStringSpecifiedCustomObjectSecretKeyValueIfExists(value, customObject, key);
    if (stringKey) {
      await this.handleCustomObjectObjectValueIfStringKeySpecified(value, key, stringKey);
    } else {
      await this.handleCustomObjectOjectValueIfMatchTypeSpecified(value, key, customObject[key] as CustomObjectMatchType);
    }
  }

  private async handleCustomObjectObjectValueIfStringKeySpecified(value: any, key: string, stringKey: string) {
    if (this.secretManager.isFullSecretKey(stringKey)) {
      value[key] = await this.primitiveRedactor.redactValue(JSON.stringify(value[key]));
    } else if (this.secretManager.isDeepSecretKey(stringKey)) {
      await this.redactObjectFieldsInPlace(value[key], true);
    } else if (this.secretManager.isSecretKey(stringKey)) {
      if (Array.isArray(value[key])) {
        value[key] = await this.redactArrayFieldsInPlace(stringKey, value[key], false);
      } else {
        await this.redactObjectFieldsInPlace(value[key], false);
      }
    }
  }

  private async handleCustomObjectOjectValueIfMatchTypeSpecified(value: any, key: string, matchType: CustomObjectMatchType) {
    switch (matchType) {
      case CustomObjectMatchType.Full:
        value[key] = JSON.stringify(value[key]);
        return Promise.resolve();
      case CustomObjectMatchType.Deep:
        return this.redactObjectFieldsInPlace(value[key], true);
      case CustomObjectMatchType.Shallow:
      case CustomObjectMatchType.Pass:
        return this.redactObjectFieldsInPlace(value[key], false);
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
        return this.primitiveRedactor.redactValue(JSON.stringify(value));
      case CustomObjectMatchType.Deep:
      case CustomObjectMatchType.Shallow:
      case CustomObjectMatchType.Pass:
      case true:
        return this.primitiveRedactor.redactValue(value);
      default:
        return Promise.resolve(value);
    }
  }

  private async handleCustomObjectPrimitiveValueIfStringKeySpecified(value: any, customObject: CustomObject, key: string) {
    const secretKey = this.getStringSpecifiedCustomObjectSecretKeyValueIfExists(value, customObject, key);
    if (!secretKey) {
      return value[key];
    }

    return this.redactPrimitiveValueIfSecret(secretKey, value[key], false);
  }

  private getStringSpecifiedCustomObjectSecretKeyValueIfExists(value: any, customObject: CustomObject, key: string): string | null {
    const hasSecretKey = typeof customObject[key] === 'string' && !!value[customObject[key]];
    return hasSecretKey ? value[customObject[key]] : null;
  }

  private isObject(value: any) {
    return !!value && typeof value === 'object' && !(value instanceof Date) && !Array.isArray(value);
  }

  private async redactPrimitiveValueIfSecret(
    key: string,
    value: any,
    forceDeepRedaction: boolean
  ): Promise<any> {
    if (this.secretManager.isFullSecretKey(key)) {
      return this.primitiveRedactor.redactValue(JSON.stringify(value));
    } else if (forceDeepRedaction || this.secretManager.isSecretKey(key) || this.secretManager.isDeepSecretKey(key)) {
      return this.primitiveRedactor.redactValue(value);
    } else {
      return value;
    }
  }
}
