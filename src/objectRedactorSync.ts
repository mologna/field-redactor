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
import { ContainerMutation, createContainerMutation } from './objectRedactorMutation';
import { ValuePatternMatcher } from './valuePatternMatcher';
import {
  getStringSpecifiedCustomObjectSecretKeyValueIfExists,
  getStringValue,
  redactPrimitiveValueIfSecret,
  toRedactablePrimitive
} from './objectRedactorHelpers';

/**
 * Synchronous JSON traversal without per-field Promise allocation.
 * Supports in-place mutation or copy-on-write structural sharing via ContainerMutation.
 */
export class ObjectRedactorSyncTraversal {
  constructor(
    private readonly primitiveRedactor: PrimitiveRedactor,
    private readonly secretManager: SecretManager,
    private readonly customObjManager: CustomObjectManager,
    private readonly valuePatternMatcher: ValuePatternMatcher
  ) {}

  redactInPlace<T extends TraversableJson>(value: T): T {
    return this.redact(value, false);
  }

  redactCopyOnWrite<T extends TraversableJson>(value: T): T {
    return this.redact(value, true);
  }

  private redact<T extends TraversableJson>(value: T, copyOnWrite: boolean): T {
    const container = createContainerMutation(value as JsonObject | JsonArray, copyOnWrite);
    const customObject = this.customObjManager.getMatchingCustomObject(value);
    if (customObject && isJsonObject(value)) {
      this.handleCustomObject(container as ContainerMutation<JsonObject>, customObject);
    } else {
      this.redactSecretFields(container, false);
    }

    return (copyOnWrite ? container.result() : value) as T;
  }

  private redactSecretFields(container: ContainerMutation<JsonObject | JsonArray>, forceDeepRedaction: boolean): void {
    const record = container.source as JsonRecord;

    for (const key of Object.keys(record)) {
      const value = record[key];
      const customObject = isJsonObject(value) ? this.customObjManager.getMatchingCustomObject(value) : undefined;
      if (customObject && isJsonObject(value)) {
        const child = createContainerMutation(value, container.copyOnWrite);
        this.handleCustomObject(child, customObject);
        if (container.copyOnWrite) {
          container.set(key, child.result());
        }
      } else if (this.secretManager.isDeleteSecretKey(key)) {
        container.remove(key);
      } else if (this.secretManager.isFullSecretKey(key)) {
        container.set(key, this.redactPrimitive(getStringValue(value)));
      } else if (Array.isArray(value)) {
        this.redactArrayInObject(value, key, forceDeepRedaction, container);
      } else if (isJsonObject(value)) {
        this.redactNestedObject(value, key, forceDeepRedaction, container);
      } else {
        container.set(key, this.redactPrimitiveValueIfSecret(key, value, forceDeepRedaction));
      }
    }
  }

  private redactArrayInObject(
    array: JsonArray,
    key: string,
    forceDeepRedaction: boolean,
    parent: ContainerMutation<JsonObject | JsonArray>
  ): void {
    const deepSecretKey = this.secretManager.isDeepSecretKey(key);
    const result =
      this.secretManager.isSecretKey(key) || deepSecretKey || forceDeepRedaction
        ? this.redactAllArrayValues(array, forceDeepRedaction || deepSecretKey, parent.copyOnWrite)
        : this.redactObjectsInArray(array, parent.copyOnWrite);
    parent.set(key, result);
  }

  private redactObjectsInArray(array: JsonArray, copyOnWrite: boolean): JsonArray {
    const container = createContainerMutation(array, copyOnWrite);

    for (let index = 0; index < array.length; index++) {
      const value = array[index];
      if (isJsonObject(value)) {
        const customObject = this.customObjManager.getMatchingCustomObject(value);
        const child = createContainerMutation(value, copyOnWrite);
        if (customObject) {
          this.handleCustomObject(child, customObject);
        } else {
          this.redactSecretFields(child, false);
        }
        container.set(String(index), child.result());
      }
    }

    return container.result();
  }

  private redactAllArrayValues(array: JsonArray, forceDeepRedaction: boolean, copyOnWrite: boolean): JsonArray {
    const container = createContainerMutation(array, copyOnWrite);

    for (let index = 0; index < array.length; index++) {
      const value = array[index];
      const key = String(index);
      if (Array.isArray(value)) {
        container.set(key, this.redactAllArrayValues(value, forceDeepRedaction, copyOnWrite));
      } else if (!isJsonObject(value)) {
        container.set(key, this.redactPrimitive(toRedactablePrimitive(value)));
      } else {
        const customObject = this.customObjManager.getMatchingCustomObject(value);
        const child = createContainerMutation(value, copyOnWrite);
        if (customObject) {
          this.handleCustomObject(child, customObject);
        } else {
          this.redactSecretFields(child, forceDeepRedaction);
        }
        container.set(key, child.result());
      }
    }

    return container.result();
  }

  private redactNestedObject(
    value: JsonObject,
    key: string,
    forceDeepRedaction: boolean,
    parent: ContainerMutation<JsonObject | JsonArray>
  ): void {
    const child = createContainerMutation(value, parent.copyOnWrite);
    const customObject = this.customObjManager.getMatchingCustomObject(value);
    if (customObject) {
      this.handleCustomObject(child, customObject);
    } else {
      this.redactSecretFields(child, forceDeepRedaction || this.secretManager.isDeepSecretKey(key));
    }
    if (parent.copyOnWrite) {
      parent.set(key, child.result());
    }
  }

  private handleCustomObject(container: ContainerMutation<JsonObject>, customObject: CustomObject): void {
    for (const key of Object.keys(customObject)) {
      const fieldValue = container.source[key];
      if (Array.isArray(fieldValue)) {
        this.handleCustomObjectValueIfArray(container, key, customObject);
      } else if (isJsonObject(fieldValue)) {
        this.handleCustomObjectValueIfObject(container, key, customObject);
      } else {
        this.handleCustomObjectValueIfPrimitive(container, customObject, key);
      }
    }
  }

  private handleCustomObjectValueIfArray(container: ContainerMutation<JsonObject>, key: string, customObject: CustomObject): void {
    const stringKey = getStringSpecifiedCustomObjectSecretKeyValueIfExists(container.source, customObject, key);
    if (stringKey !== undefined) {
      this.handleCustomObjectArrayValueIfStringKeySpecified(container, key, stringKey);
    } else {
      this.handleCustomObjectArrayValueIfMatchTypeSpecified(container, key, customObject[key] as CustomObjectMatchType);
    }
  }

  private handleCustomObjectArrayValueIfStringKeySpecified(
    container: ContainerMutation<JsonObject>,
    key: string,
    stringKey: SecretSpecifierValue
  ): void {
    const fieldValue = container.source[key];
    if (!Array.isArray(fieldValue)) {
      return;
    }

    if (this.secretManager.isDeleteSecretKey(stringKey)) {
      container.remove(key);
    } else if (this.secretManager.isFullSecretKey(stringKey)) {
      container.set(key, this.redactPrimitive(getStringValue(fieldValue)));
    } else {
      const isDeepSecretKey = this.secretManager.isDeepSecretKey(stringKey);
      if (isDeepSecretKey || this.secretManager.isSecretKey(stringKey)) {
        container.set(key, this.redactAllArrayValues(fieldValue, isDeepSecretKey, container.copyOnWrite));
      }
    }
  }

  private handleCustomObjectArrayValueIfMatchTypeSpecified(
    container: ContainerMutation<JsonObject>,
    key: string,
    matchType: CustomObjectMatchType
  ): void {
    const fieldValue = container.source[key];
    if (!Array.isArray(fieldValue)) {
      return;
    }

    switch (matchType) {
      case CustomObjectMatchType.Delete:
        container.remove(key);
        return;
      case CustomObjectMatchType.Full:
        container.set(key, this.redactPrimitive(getStringValue(fieldValue)));
        return;
      case CustomObjectMatchType.Deep:
        container.set(key, this.redactAllArrayValues(fieldValue, true, container.copyOnWrite));
        return;
      case CustomObjectMatchType.Shallow:
        container.set(key, this.redactAllArrayValues(fieldValue, false, container.copyOnWrite));
        return;
      case CustomObjectMatchType.Pass:
        this.redactArrayInObject(fieldValue, key, false, container);
      default:
        return;
    }
  }

  private handleCustomObjectValueIfObject(container: ContainerMutation<JsonObject>, key: string, customObject: CustomObject): void {
    const stringKey = getStringSpecifiedCustomObjectSecretKeyValueIfExists(container.source, customObject, key);
    if (stringKey !== undefined) {
      this.handleCustomObjectObjectValueIfStringKeySpecified(container, key, stringKey);
    } else {
      this.handleCustomObjectObjectValueIfMatchTypeSpecified(container, key, customObject[key] as CustomObjectMatchType);
    }
  }

  private handleCustomObjectObjectValueIfStringKeySpecified(
    container: ContainerMutation<JsonObject>,
    key: string,
    stringKey: SecretSpecifierValue
  ): void {
    const fieldValue = container.source[key];
    if (!isJsonObject(fieldValue)) {
      return;
    }

    const customObject = this.customObjManager.getMatchingCustomObject(fieldValue);
    if (customObject) {
      const child = createContainerMutation(fieldValue, container.copyOnWrite);
      this.handleCustomObject(child, customObject);
      container.set(key, child.result());
    } else if (this.secretManager.isDeleteSecretKey(stringKey)) {
      container.remove(key);
    } else if (this.secretManager.isFullSecretKey(stringKey)) {
      container.set(key, this.redactPrimitive(getStringValue(fieldValue)));
    } else if (this.secretManager.isDeepSecretKey(stringKey)) {
      const child = createContainerMutation(fieldValue, container.copyOnWrite);
      this.redactSecretFields(child, true);
      container.set(key, child.result());
    } else if (this.secretManager.isSecretKey(stringKey)) {
      const child = createContainerMutation(fieldValue, container.copyOnWrite);
      this.redactSecretFields(child, false);
      container.set(key, child.result());
    }
  }

  private handleCustomObjectObjectValueIfMatchTypeSpecified(
    container: ContainerMutation<JsonObject>,
    key: string,
    matchType: CustomObjectMatchType
  ): void {
    const fieldValue = container.source[key];
    if (!isJsonObject(fieldValue)) {
      return;
    }

    switch (matchType) {
      case CustomObjectMatchType.Delete:
        container.remove(key);
        return;
      case CustomObjectMatchType.Full:
        container.set(key, this.redactPrimitive(getStringValue(fieldValue)));
        return;
      case CustomObjectMatchType.Deep: {
        const child = createContainerMutation(fieldValue, container.copyOnWrite);
        this.redactSecretFields(child, true);
        container.set(key, child.result());
        return;
      }
      case CustomObjectMatchType.Shallow:
      case CustomObjectMatchType.Pass: {
        const child = createContainerMutation(fieldValue, container.copyOnWrite);
        this.redactSecretFields(child, false);
        container.set(key, child.result());
        return;
      }
      case CustomObjectMatchType.Ignore:
        return;
    }
  }

  private handleCustomObjectValueIfPrimitive(
    container: ContainerMutation<JsonObject>,
    customObject: CustomObject,
    key: string
  ): void {
    if (typeof customObject[key] === 'number') {
      this.handleCustomObjectPrimitiveValueIfMatchTypeSpecified(container, key, customObject[key]);
      return;
    }

    const secretKey = getStringSpecifiedCustomObjectSecretKeyValueIfExists(container.source, customObject, key);
    if (secretKey === undefined) {
      return;
    }

    this.handleCustomObjectPrimitiveValueIfStringKeySpecified(container, secretKey, key);
  }

  private handleCustomObjectPrimitiveValueIfMatchTypeSpecified(
    container: ContainerMutation<JsonObject>,
    key: string,
    matchValue: CustomObjectMatchType
  ): void {
    switch (matchValue) {
      case CustomObjectMatchType.Delete:
        container.remove(key);
        return;
      case CustomObjectMatchType.Full:
        container.set(key, this.redactPrimitive(getStringValue(container.source[key])));
        return;
      case CustomObjectMatchType.Deep:
      case CustomObjectMatchType.Shallow:
        container.set(key, this.redactPrimitive(container.source[key] as RedactablePrimitive));
        return;
      case CustomObjectMatchType.Pass:
      default:
        return;
    }
  }

  private handleCustomObjectPrimitiveValueIfStringKeySpecified(
    container: ContainerMutation<JsonObject>,
    secretKey: SecretSpecifierValue,
    key: string
  ): void {
    if (this.secretManager.isDeleteSecretKey(secretKey)) {
      container.remove(key);
    } else {
      container.set(
        key,
        this.redactPrimitiveValueIfSecret(secretKey, container.source[key] as RedactablePrimitive, false)
      );
    }
  }

  private redactPrimitiveValueIfSecret(
    key: SecretSpecifierValue,
    value: JsonLeafValue | undefined,
    forceDeepRedaction: boolean
  ): JsonValue | undefined {
    return redactPrimitiveValueIfSecret(
      this.secretManager,
      this.valuePatternMatcher,
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
