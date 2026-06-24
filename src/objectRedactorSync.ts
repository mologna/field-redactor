import {
  CustomObject,
  CustomObjectMatchType,
  isJsonObject,
  JsonArray,
  JsonLeafValue,
  JsonObject,
  JsonRecord,
  JsonValue,
  RedactablePrimitive,
  SecretSpecifierValue,
  TraversableJson
} from './types';
import { SecretManager } from './secretManager';
import { CustomObjectManager } from './customObjectManager';
import { PrimitiveRedactor } from './primitiveRedactor';
import {
  getStringSpecifiedCustomObjectSecretKeyValueIfExists,
  getStringValue,
  redactPrimitiveValueIfSecret,
  toRedactablePrimitive
} from './objectRedactorHelpers';

/**
 * Synchronous in-place JSON traversal without per-field Promise allocation.
 */
export class ObjectRedactorSyncTraversal {
  constructor(
    private readonly primitiveRedactor: PrimitiveRedactor,
    private readonly secretManager: SecretManager,
    private readonly customObjManager: CustomObjectManager
  ) {}

  redactInPlace<T extends TraversableJson>(value: T): T {
    const customObject = this.customObjManager.getMatchingCustomObject(value);
    if (customObject) {
      this.handleCustomObjectInPlace(value as JsonObject, customObject);
    } else {
      this.redactSecretObjectFieldsInPlace(value);
    }

    return value;
  }

  private redactSecretObjectFieldsInPlace(object: JsonObject | JsonArray, forceDeepRedaction: boolean = false): void {
    const record = object as JsonRecord;

    for (const key of Object.keys(record)) {
      const value = record[key];
      const customObject = isJsonObject(value) ? this.customObjManager.getMatchingCustomObject(value) : undefined;
      if (customObject && isJsonObject(value)) {
        this.handleCustomObjectInPlace(value, customObject);
      } else if (this.secretManager.isDeleteSecretKey(key)) {
        delete record[key];
      } else if (this.secretManager.isFullSecretKey(key)) {
        record[key] = this.redactPrimitive(getStringValue(value));
      } else if (Array.isArray(value)) {
        record[key] = this.redactArrayInObject(value, key, forceDeepRedaction);
      } else if (isJsonObject(value)) {
        this.redactObjectInObject(value, key, forceDeepRedaction);
      } else {
        record[key] = this.redactPrimitiveValueIfSecret(key, value, forceDeepRedaction);
      }
    }
  }

  private redactArrayInObject(array: JsonArray, key: string, forceDeepRedaction: boolean): JsonArray {
    const deepSecretKey = this.secretManager.isDeepSecretKey(key);
    if (this.secretManager.isSecretKey(key) || deepSecretKey || forceDeepRedaction) {
      return this.redactAllArrayValues(array, forceDeepRedaction || deepSecretKey);
    }

    return this.redactObjectsInArray(array);
  }

  private redactObjectsInArray(array: JsonArray): JsonArray {
    for (let index = 0; index < array.length; index++) {
      const value = array[index];
      if (isJsonObject(value)) {
        const customObject = this.customObjManager.getMatchingCustomObject(value);
        if (customObject) {
          this.handleCustomObjectInPlace(value, customObject);
        } else {
          this.redactSecretObjectFieldsInPlace(value, false);
        }
      }
    }

    return array;
  }

  private redactAllArrayValues(array: JsonArray, forceDeepRedaction: boolean): JsonArray {
    for (let index = 0; index < array.length; index++) {
      const value = array[index];
      if (Array.isArray(value)) {
        array[index] = this.redactAllArrayValues(value, forceDeepRedaction);
      } else if (!isJsonObject(value)) {
        array[index] = this.redactPrimitive(toRedactablePrimitive(value));
      } else {
        const customObject = this.customObjManager.getMatchingCustomObject(value);
        if (customObject) {
          this.handleCustomObjectInPlace(value, customObject);
        } else {
          this.redactSecretObjectFieldsInPlace(value, forceDeepRedaction);
        }
      }
    }

    return array;
  }

  private redactObjectInObject(value: JsonObject, key: string, forceDeepRedaction: boolean): void {
    const customObject = this.customObjManager.getMatchingCustomObject(value);
    if (customObject) {
      this.handleCustomObjectInPlace(value, customObject);
      return;
    }

    this.redactSecretObjectFieldsInPlace(value, forceDeepRedaction || this.secretManager.isDeepSecretKey(key));
  }

  private handleCustomObjectInPlace(value: JsonObject, customObject: CustomObject): void {
    for (const key of Object.keys(customObject)) {
      const fieldValue = value[key];
      if (Array.isArray(fieldValue)) {
        this.handleCustomObjectValueIfArray(value, key, customObject);
      } else if (isJsonObject(fieldValue)) {
        this.handleCustomObjectValueIfObject(value, key, customObject);
      } else {
        this.handleCustomObjectValueIfPrimitive(value, customObject, key);
      }
    }
  }

  private handleCustomObjectValueIfArray(value: JsonObject, key: string, customObject: CustomObject): void {
    const stringKey = getStringSpecifiedCustomObjectSecretKeyValueIfExists(value, customObject, key);
    if (stringKey !== undefined) {
      this.handleCustomObjectArrayValueIfStringKeySpecified(value, key, stringKey);
    } else {
      this.handleCustomObjectArrayValueIfMatchTypeSpecified(value, key, customObject[key] as CustomObjectMatchType);
    }
  }

  private handleCustomObjectArrayValueIfStringKeySpecified(
    value: JsonObject,
    key: string,
    stringKey: SecretSpecifierValue
  ): void {
    const fieldValue = value[key];
    if (!Array.isArray(fieldValue)) {
      return;
    }

    if (this.secretManager.isDeleteSecretKey(stringKey)) {
      delete value[key];
    } else if (this.secretManager.isFullSecretKey(stringKey)) {
      value[key] = this.redactPrimitive(getStringValue(fieldValue));
    } else {
      const isDeepSecretKey = this.secretManager.isDeepSecretKey(stringKey);
      if (isDeepSecretKey || this.secretManager.isSecretKey(stringKey)) {
        value[key] = this.redactAllArrayValues(fieldValue, isDeepSecretKey);
      }
    }
  }

  private handleCustomObjectArrayValueIfMatchTypeSpecified(
    value: JsonObject,
    key: string,
    matchType: CustomObjectMatchType
  ): void {
    const fieldValue = value[key];
    if (!Array.isArray(fieldValue)) {
      return;
    }

    switch (matchType) {
      case CustomObjectMatchType.Delete:
        delete value[key];
        return;
      case CustomObjectMatchType.Full:
        value[key] = this.redactPrimitive(getStringValue(fieldValue));
        return;
      case CustomObjectMatchType.Deep:
        value[key] = this.redactAllArrayValues(fieldValue, true);
        return;
      case CustomObjectMatchType.Shallow:
        value[key] = this.redactAllArrayValues(fieldValue, false);
        return;
      case CustomObjectMatchType.Pass:
        value[key] = this.redactArrayInObject(fieldValue, key, false);
      default:
        return;
    }
  }

  private handleCustomObjectValueIfObject(value: JsonObject, key: string, customObject: CustomObject): void {
    const stringKey = getStringSpecifiedCustomObjectSecretKeyValueIfExists(value, customObject, key);
    if (stringKey !== undefined) {
      this.handleCustomObjectObjectValueIfStringKeySpecified(value, key, stringKey);
    } else {
      this.handleCustomObjectObjectValueIfMatchTypeSpecified(value, key, customObject[key] as CustomObjectMatchType);
    }
  }

  private handleCustomObjectObjectValueIfStringKeySpecified(
    value: JsonObject,
    key: string,
    stringKey: SecretSpecifierValue
  ): void {
    const fieldValue = value[key];
    if (!isJsonObject(fieldValue)) {
      return;
    }

    const customObject = this.customObjManager.getMatchingCustomObject(fieldValue);
    if (customObject) {
      this.handleCustomObjectInPlace(fieldValue, customObject);
    } else if (this.secretManager.isDeleteSecretKey(stringKey)) {
      delete value[key];
    } else if (this.secretManager.isFullSecretKey(stringKey)) {
      value[key] = this.redactPrimitive(getStringValue(fieldValue));
    } else if (this.secretManager.isDeepSecretKey(stringKey)) {
      this.redactSecretObjectFieldsInPlace(fieldValue, true);
    } else if (this.secretManager.isSecretKey(stringKey)) {
      this.redactSecretObjectFieldsInPlace(fieldValue, false);
    }
  }

  private handleCustomObjectObjectValueIfMatchTypeSpecified(
    value: JsonObject,
    key: string,
    matchType: CustomObjectMatchType
  ): void {
    const fieldValue = value[key];
    if (!isJsonObject(fieldValue)) {
      return;
    }

    switch (matchType) {
      case CustomObjectMatchType.Delete:
        delete value[key];
        return;
      case CustomObjectMatchType.Full:
        value[key] = this.redactPrimitive(getStringValue(fieldValue));
        return;
      case CustomObjectMatchType.Deep:
        this.redactSecretObjectFieldsInPlace(fieldValue, true);
        return;
      case CustomObjectMatchType.Shallow:
      case CustomObjectMatchType.Pass:
        this.redactSecretObjectFieldsInPlace(fieldValue, false);
        return;
      case CustomObjectMatchType.Ignore:
        return;
    }
  }

  private handleCustomObjectValueIfPrimitive(value: JsonObject, customObject: CustomObject, key: string): void {
    if (typeof customObject[key] === 'number') {
      this.handleCustomObjectPrimitiveValueIfMatchTypeSpecified(value, key, customObject[key]);
      return;
    }

    const secretKey = getStringSpecifiedCustomObjectSecretKeyValueIfExists(value, customObject, key);
    if (secretKey === undefined) {
      return;
    }

    this.handleCustomObjectPrimitiveValueIfStringKeySpecified(value, secretKey, key);
  }

  private handleCustomObjectPrimitiveValueIfMatchTypeSpecified(
    value: JsonObject,
    key: string,
    matchValue: CustomObjectMatchType
  ): void {
    switch (matchValue) {
      case CustomObjectMatchType.Delete:
        delete value[key];
        return;
      case CustomObjectMatchType.Full:
        value[key] = this.redactPrimitive(getStringValue(value[key]));
        return;
      case CustomObjectMatchType.Deep:
      case CustomObjectMatchType.Shallow:
        value[key] = this.redactPrimitive(value[key] as RedactablePrimitive);
        return;
      case CustomObjectMatchType.Pass:
      default:
        return;
    }
  }

  private handleCustomObjectPrimitiveValueIfStringKeySpecified(
    value: JsonObject,
    secretKey: SecretSpecifierValue,
    key: string
  ): void {
    if (this.secretManager.isDeleteSecretKey(secretKey)) {
      delete value[key];
    } else {
      value[key] = this.redactPrimitiveValueIfSecret(secretKey, value[key] as RedactablePrimitive, false);
    }
  }

  private redactPrimitiveValueIfSecret(
    key: SecretSpecifierValue,
    value: JsonLeafValue | undefined,
    forceDeepRedaction: boolean
  ): JsonValue | undefined {
    return redactPrimitiveValueIfSecret(
      this.secretManager,
      (primitive) => this.redactPrimitive(primitive),
      key,
      value,
      forceDeepRedaction
    );
  }

  private redactPrimitive(value: RedactablePrimitive): JsonValue | undefined {
    return this.primitiveRedactor.redactValueSync(value);
  }
}
