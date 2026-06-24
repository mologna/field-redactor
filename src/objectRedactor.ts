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
import { ObjectRedactorSyncTraversal } from './objectRedactorSync';

/**
 * Redacts fields in a JSON object using the secretManager, primitiveRedactor, and CustomObjectChecker provided in the
 * constructor. The redaction is done in place and the redacted object is returned. CustomObjects take highest precedence,
 * followed by fullSecretKeys, then deepSecretKeys, and finally secretKeys. If a field is an object or an array it is
 * assessed recursively unless otherwise configured by a CustomObject or deepSecretKey.
 */
export class ObjectRedactor {
  private readonly syncTraversal: ObjectRedactorSyncTraversal;

  constructor(
    private readonly primitiveRedactor: PrimitiveRedactor,
    private readonly secretManager: SecretManager,
    private readonly customObjManager: CustomObjectManager
  ) {
    this.syncTraversal = new ObjectRedactorSyncTraversal(primitiveRedactor, secretManager, customObjManager);
  }

  /**
   * Conditionally redacts fields in the JSON object in place based on the configuration using the
   * primitive redactor, custom object checker, and secret manager provided in the constructor.
   * @param value The JSON value to redact in place.
   * @returns The JSON value provided in the argument.
   */
  public async redactInPlace<T extends TraversableJson>(value: T): Promise<T> {
    if (!this.primitiveRedactor.usesAsyncRedactor()) {
      return Promise.resolve(this.redactInPlaceSync(value));
    }

    return this.redactInPlaceAsync(value);
  }

  /**
   * Synchronously redacts fields in the JSON object in place without Promise allocation per field.
   */
  public redactInPlaceSync<T extends TraversableJson>(value: T): T {
    return this.syncTraversal.redactInPlace(value);
  }

  private async redactInPlaceAsync<T extends TraversableJson>(value: T): Promise<T> {
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
        record[key] = await this.redactPrimitive(getStringValue(value));
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
    for (let index = 0; index < array.length; index++) {
      const value = array[index];
      if (isJsonObject(value)) {
        const customObject = this.customObjManager.getMatchingCustomObject(value);
        if (customObject) {
          await this.handleCustomObjectInPlace(value, customObject);
        } else {
          await this.redactSecretObjectFieldsInPlace(value, false);
        }
      }
    }

    return array;
  }

  private async redactAllArrayValues(array: JsonArray, forceDeepRedaction: boolean): Promise<JsonArray> {
    for (let index = 0; index < array.length; index++) {
      const value = array[index];
      if (Array.isArray(value)) {
        array[index] = await this.redactAllArrayValues(value, forceDeepRedaction);
      } else if (!isJsonObject(value)) {
        array[index] = await this.redactPrimitive(toRedactablePrimitive(value));
      } else {
        const customObject = this.customObjManager.getMatchingCustomObject(value);
        if (customObject) {
          await this.handleCustomObjectInPlace(value, customObject);
        } else {
          await this.redactSecretObjectFieldsInPlace(value, forceDeepRedaction);
        }
      }
    }

    return array;
  }

  private async redactObjectInObject(value: JsonObject, key: string, forceDeepRedaction: boolean): Promise<void> {
    const customObject = this.customObjManager.getMatchingCustomObject(value);
    if (customObject) {
      await this.handleCustomObjectInPlace(value, customObject);
      return;
    }

    await this.redactSecretObjectFieldsInPlace(value, forceDeepRedaction || this.secretManager.isDeepSecretKey(key));
  }

  private async handleCustomObjectInPlace(value: JsonObject, customObject: CustomObject): Promise<void> {
    for (const key of Object.keys(customObject)) {
      const fieldValue = value[key];
      if (Array.isArray(fieldValue)) {
        await this.handleCustomObjectValueIfArray(value, key, customObject);
      } else if (isJsonObject(fieldValue)) {
        await this.handleCustomObjectValueIfObject(value, key, customObject);
      } else {
        await this.handleCustomObjectValueIfPrimitive(value, customObject, key);
      }
    }
  }

  private async handleCustomObjectValueIfArray(value: JsonObject, key: string, customObject: CustomObject) {
    const stringKey = getStringSpecifiedCustomObjectSecretKeyValueIfExists(value, customObject, key);
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
      value[key] = await this.redactPrimitive(getStringValue(fieldValue));
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
        value[key] = await this.redactPrimitive(getStringValue(fieldValue));
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

  private async handleCustomObjectValueIfObject(value: JsonObject, key: string, customObject: CustomObject): Promise<void> {
    const stringKey = getStringSpecifiedCustomObjectSecretKeyValueIfExists(value, customObject, key);
    if (stringKey !== undefined) {
      await this.handleCustomObjectObjectValueIfStringKeySpecified(value, key, stringKey);
    } else {
      await this.handleCustomObjectObjectValueIfMatchTypeSpecified(value, key, customObject[key] as CustomObjectMatchType);
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
      value[key] = await this.redactPrimitive(getStringValue(fieldValue));
    } else if (this.secretManager.isDeepSecretKey(stringKey)) {
      await this.redactSecretObjectFieldsInPlace(fieldValue, true);
    } else if (this.secretManager.isSecretKey(stringKey)) {
      await this.redactSecretObjectFieldsInPlace(fieldValue, false);
    }
  }

  private async handleCustomObjectObjectValueIfMatchTypeSpecified(
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
        value[key] = await this.redactPrimitive(getStringValue(fieldValue));
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

    const secretKey = getStringSpecifiedCustomObjectSecretKeyValueIfExists(value, customObject, key);
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
        value[key] = await this.redactPrimitive(getStringValue(value[key]));
        return;
      case CustomObjectMatchType.Deep:
      case CustomObjectMatchType.Shallow:
        value[key] = await this.redactPrimitive(value[key] as RedactablePrimitive);
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

  private async redactPrimitiveValueIfSecret(
    key: SecretSpecifierValue,
    value: JsonLeafValue | undefined,
    forceDeepRedaction: boolean
  ): Promise<JsonValue | undefined> {
    return redactPrimitiveValueIfSecret(
      this.secretManager,
      (primitive) => this.redactPrimitive(primitive),
      key,
      value,
      forceDeepRedaction
    );
  }

  private redactPrimitive(value: RedactablePrimitive): Promise<JsonValue | undefined> {
    return this.primitiveRedactor.redactValue(value);
  }
}
