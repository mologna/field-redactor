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
  public async redactInPlace<T extends TraversableJson>(value: T): Promise<T> {
    const customObject = this.customObjManager.getMatchingCustomObject(value);
    if (customObject) {
      await this.handleCustomObjectInPlace(value as JsonObject, customObject);
    } else {
      await this.redactSecretObjectFieldsInPlace(value);
    }

    return value;
  }

  private async redactSecretObjectFieldsInPlace(
    object: JsonObject | JsonArray,
    forceDeepRedaction: boolean = false
  ): Promise<void> {
    const record = object as JsonRecord;

    for (const key of Object.keys(record)) {
      const value = record[key];
      const customObject = isJsonObject(value) ? this.customObjManager.getMatchingCustomObject(value) : undefined;
      if (customObject && isJsonObject(value)) {
        await this.handleCustomObjectInPlace(value, customObject);
      } else if (this.secretManager.isDeleteSecretKey(key)) {
        delete record[key];
      } else if (this.secretManager.isFullSecretKey(key)) {
        record[key] = await this.primitiveRedactor.redactValue(this.getStringValue(value));
      } else if (Array.isArray(value)) {
        record[key] = await this.redactArrayInObject(value, key, forceDeepRedaction);
      } else if (isJsonObject(value)) {
        await this.redactObjectInObject(value, key, forceDeepRedaction);
      } else {
        record[key] = await this.redactPrimitiveValueIfSecret(key, value, forceDeepRedaction);
      }
    }
  }

  private async redactArrayInObject(array: JsonArray, key: string, forceDeepRedaction: boolean): Promise<JsonArray> {
    const deepSecretKey = this.secretManager.isDeepSecretKey(key);
    if (this.secretManager.isSecretKey(key) || deepSecretKey || forceDeepRedaction) {
      return this.redactAllArrayValues(array, forceDeepRedaction || deepSecretKey);
    }

    return this.redactObjectsInArray(array);
  }

  private async redactObjectsInArray(array: JsonArray): Promise<JsonArray> {
    const promises = array.map(async (value) => {
      if (isJsonObject(value)) {
        const customObject = this.customObjManager.getMatchingCustomObject(value);
        if (customObject) {
          await this.handleCustomObjectInPlace(value, customObject);
        } else {
          await this.redactSecretObjectFieldsInPlace(value, false);
        }
      }

      return value;
    });

    return Promise.all(promises);
  }

  private async redactAllArrayValues(array: JsonArray, forceDeepRedaction: boolean): Promise<JsonArray> {
    const promises = array.map(async (value) => {
      if (Array.isArray(value)) {
        return this.redactAllArrayValues(value, forceDeepRedaction);
      }

      if (!isJsonObject(value)) {
        return this.primitiveRedactor.redactValue(this.toRedactablePrimitive(value));
      }

      const customObject = this.customObjManager.getMatchingCustomObject(value);
      if (customObject) {
        await this.handleCustomObjectInPlace(value, customObject);
      } else {
        await this.redactSecretObjectFieldsInPlace(value, forceDeepRedaction);
      }

      return value;
    });

    return Promise.all(promises);
  }

  private async redactObjectInObject(value: JsonObject, key: string, forceDeepRedaction: boolean): Promise<void> {
    const customObject = this.customObjManager.getMatchingCustomObject(value);
    if (customObject) {
      await this.handleCustomObjectInPlace(value, customObject);
      return;
    }

    const secretObject = forceDeepRedaction || this.secretManager.isDeepSecretKey(key);
    await this.redactSecretObjectFieldsInPlace(value, secretObject);
  }

  private async handleCustomObjectInPlace(value: JsonObject, customObject: CustomObject): Promise<void> {
    for (const key of Object.keys(customObject)) {
      const fieldValue = value[key];
      if (Array.isArray(fieldValue)) {
        await this.handleCustomObjectValueIfArray(value, key, customObject);
      } else if (isJsonObject(fieldValue)) {
        await this.handlecustomObjectValueIfObject(value, key, customObject);
      } else {
        await this.handleCustomObjectValueIfPrimitive(value, customObject, key);
      }
    }
  }

  private async handleCustomObjectValueIfArray(value: JsonObject, key: string, customObject: CustomObject) {
    const stringKey = this.getStringSpecifiedCustomObjectSecretKeyValueIfExists(value, customObject, key);
    if (stringKey !== undefined) {
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
    value: JsonObject,
    customObject: CustomObject,
    key: string
  ): SecretSpecifierValue | undefined {
    // Returns the sibling key's value when the sibling key is present, including falsy values.
    const siblingKeyName = customObject[key];
    if (typeof siblingKeyName !== 'string') {
      return undefined;
    }

    if (!Object.prototype.hasOwnProperty.call(value, siblingKeyName)) {
      return undefined;
    }

    const siblingValue = value[siblingKeyName];
    if (
      typeof siblingValue === 'string' ||
      typeof siblingValue === 'number' ||
      typeof siblingValue === 'boolean'
    ) {
      return siblingValue;
    }

    return undefined;
  }

  private async handleCustomObjectArrayValueIfStringKeySpecified(
    value: JsonObject,
    key: string,
    stringKey: SecretSpecifierValue
  ) {
    const fieldValue = value[key];
    if (!Array.isArray(fieldValue)) {
      return;
    }

    if (this.secretManager.isDeleteSecretKey(stringKey)) {
      delete value[key];
    } else if (this.secretManager.isFullSecretKey(stringKey)) {
      value[key] = await this.primitiveRedactor.redactValue(this.getStringValue(fieldValue));
    } else {
      const isDeepSecretKey = this.secretManager.isDeepSecretKey(stringKey);
      if (isDeepSecretKey || this.secretManager.isSecretKey(stringKey)) {
        value[key] = await this.redactAllArrayValues(fieldValue, isDeepSecretKey);
      }
    }
  }

  private async handleCustomObjectArrayValueIfMatchTypeSpecified(
    value: JsonObject,
    key: string,
    matchType: CustomObjectMatchType
  ) {
    const fieldValue = value[key];
    if (!Array.isArray(fieldValue)) {
      return;
    }

    switch (matchType) {
      case CustomObjectMatchType.Delete:
        delete value[key];
        return;
      case CustomObjectMatchType.Full:
        value[key] = await this.primitiveRedactor.redactValue(this.getStringValue(fieldValue));
        return;
      case CustomObjectMatchType.Deep:
        value[key] = await this.redactAllArrayValues(fieldValue, true);
        return;
      case CustomObjectMatchType.Shallow:
        value[key] = await this.redactAllArrayValues(fieldValue, false);
        return;
      case CustomObjectMatchType.Pass:
        value[key] = await this.redactArrayInObject(fieldValue, key, false);
      default:
        return;
    }
  }

  private async handlecustomObjectValueIfObject(value: JsonObject, key: string, customObject: CustomObject): Promise<void> {
    const stringKey = this.getStringSpecifiedCustomObjectSecretKeyValueIfExists(value, customObject, key);
    if (stringKey !== undefined) {
      await this.handleCustomObjectObjectValueIfStringKeySpecified(value, key, stringKey);
    } else {
      await this.handleCustomObjectOjectValueIfMatchTypeSpecified(
        value,
        key,
        customObject[key] as CustomObjectMatchType
      );
    }
  }

  private async handleCustomObjectObjectValueIfStringKeySpecified(
    value: JsonObject,
    key: string,
    stringKey: SecretSpecifierValue
  ) {
    const fieldValue = value[key];
    if (!isJsonObject(fieldValue)) {
      return;
    }

    const customObject = this.customObjManager.getMatchingCustomObject(fieldValue);
    if (customObject) {
      await this.handleCustomObjectInPlace(fieldValue, customObject);
    } else if (this.secretManager.isDeleteSecretKey(stringKey)) {
      delete value[key];
    } else if (this.secretManager.isFullSecretKey(stringKey)) {
      value[key] = await this.primitiveRedactor.redactValue(this.getStringValue(fieldValue));
    } else if (this.secretManager.isDeepSecretKey(stringKey)) {
      await this.redactSecretObjectFieldsInPlace(fieldValue, true);
    } else if (this.secretManager.isSecretKey(stringKey)) {
      await this.redactSecretObjectFieldsInPlace(fieldValue, false);
    }
  }

  private async handleCustomObjectOjectValueIfMatchTypeSpecified(
    value: JsonObject,
    key: string,
    matchType: CustomObjectMatchType
  ) {
    const fieldValue = value[key];
    if (!isJsonObject(fieldValue)) {
      return;
    }

    switch (matchType) {
      case CustomObjectMatchType.Delete:
        delete value[key];
        return;
      case CustomObjectMatchType.Full:
        value[key] = await this.primitiveRedactor.redactValue(this.getStringValue(fieldValue));
        return;
      case CustomObjectMatchType.Deep:
        await this.redactSecretObjectFieldsInPlace(fieldValue, true);
        return;
      case CustomObjectMatchType.Shallow:
      case CustomObjectMatchType.Pass:
        await this.redactSecretObjectFieldsInPlace(fieldValue, false);
        return;
      case CustomObjectMatchType.Ignore:
        return;
    }
  }

  private async handleCustomObjectValueIfPrimitive(value: JsonObject, customObject: CustomObject, key: string) {
    if (typeof customObject[key] === 'number') {
      return this.handleCustomObjectPrimitiveValueIfMatchTypeSpecified(value, key, customObject[key]);
    }

    const secretKey = this.getStringSpecifiedCustomObjectSecretKeyValueIfExists(value, customObject, key);
    if (secretKey === undefined) {
      return;
    }

    await this.handleCustomObjectPrimitiveValueIfStringKeySpecified(value, secretKey, key);
  }

  private async handleCustomObjectPrimitiveValueIfMatchTypeSpecified(
    value: JsonObject,
    key: string,
    matchValue: CustomObjectMatchType
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
        value[key] = await this.primitiveRedactor.redactValue(value[key] as RedactablePrimitive);
        return;
      case CustomObjectMatchType.Pass:
      default:
        return;
    }
  }

  private async handleCustomObjectPrimitiveValueIfStringKeySpecified(
    value: JsonObject,
    secretKey: SecretSpecifierValue,
    key: string
  ) {
    if (this.secretManager.isDeleteSecretKey(secretKey)) {
      delete value[key];
    } else {
      value[key] = await this.redactPrimitiveValueIfSecret(secretKey, value[key] as RedactablePrimitive, false);
    }
  }

  private toRedactablePrimitive(value: JsonLeafValue | undefined): RedactablePrimitive {
    if (value instanceof Date || typeof value === 'function') {
      return this.getStringValue(value);
    }

    return value;
  }

  private getStringValue(val: JsonValue | undefined): RedactablePrimitive {
    if (isJsonObject(val) || Array.isArray(val)) {
      return JSON.stringify(val);
    }

    if (val instanceof Date || typeof val === 'function') {
      return val.toString();
    }

    return val;
  }

  private async redactPrimitiveValueIfSecret(
    key: SecretSpecifierValue,
    value: JsonLeafValue | undefined,
    forceDeepRedaction: boolean
  ): Promise<JsonValue | undefined> {
    if (value instanceof Date || typeof value === 'function') {
      if (
        this.secretManager.isFullSecretKey(key) ||
        forceDeepRedaction ||
        this.secretManager.isSecretKey(key) ||
        this.secretManager.isDeepSecretKey(key)
      ) {
        return this.primitiveRedactor.redactValue(this.getStringValue(value));
      }

      return value;
    }

    if (this.secretManager.isFullSecretKey(key)) {
      return this.primitiveRedactor.redactValue(this.getStringValue(value));
    }

    if (forceDeepRedaction || this.secretManager.isSecretKey(key) || this.secretManager.isDeepSecretKey(key)) {
      return this.primitiveRedactor.redactValue(value);
    }

    return value;
  }
}
