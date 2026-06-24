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

import {
  applyCustomObjectArrayMatchType,
  applyCustomObjectArrayMatchTypeAsync,
  applyCustomObjectObjectMatchType,
  applyCustomObjectObjectMatchTypeAsync,
  applyCustomObjectPrimitiveMatchType,
  applyCustomObjectPrimitiveMatchTypeAsync
} from './objectRedactorCustomObject';

/**
 * Unified JSON traversal for in-place and copy-on-write redaction.
 * Sync paths avoid Promise allocation; async paths use the same ContainerMutation adapter.
 */
export class ObjectRedactorTraversal {
  constructor(
    private readonly primitiveRedactor: PrimitiveRedactor,
    private readonly secretManager: SecretManager,
    private readonly customObjManager: CustomObjectManager,
    private readonly valuePatternMatcher: ValuePatternMatcher
  ) {}

  usesAsyncRedactor(): boolean {
    return this.primitiveRedactor.usesAsyncRedactor();
  }

  redactInPlace<T extends TraversableJson>(value: T): T {
    return this.redact(value, false);
  }

  redactCopyOnWrite<T extends TraversableJson>(value: T): T {
    return this.redact(value, true);
  }

  redactInPlaceAsync<T extends TraversableJson>(value: T): Promise<T> {
    return this.redactAsync(value, false);
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

    applyCustomObjectArrayMatchType(matchType, {
      deleteKey: () => container.remove(key),
      redactFull: () => container.set(key, this.redactPrimitive(getStringValue(fieldValue))),
      redactDeep: () => container.set(key, this.redactAllArrayValues(fieldValue, true, container.copyOnWrite)),
      redactShallow: () => container.set(key, this.redactAllArrayValues(fieldValue, false, container.copyOnWrite)),
      passThrough: () => {
        this.redactArrayInObject(fieldValue, key, false, container);
      }
    });
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

    applyCustomObjectObjectMatchType(matchType, {
      deleteKey: () => container.remove(key),
      redactFull: () => container.set(key, this.redactPrimitive(getStringValue(fieldValue))),
      redactDeep: () => {
        const child = createContainerMutation(fieldValue, container.copyOnWrite);
        this.redactSecretFields(child, true);
        container.set(key, child.result());
      },
      redactShallowOrPass: () => {
        const child = createContainerMutation(fieldValue, container.copyOnWrite);
        this.redactSecretFields(child, false);
        container.set(key, child.result());
      },
      ignore: () => undefined
    });
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
    applyCustomObjectPrimitiveMatchType(matchValue, {
      deleteKey: () => container.remove(key),
      redactFull: () => container.set(key, this.redactPrimitive(getStringValue(container.source[key]))),
      redactScalar: () => container.set(key, this.redactPrimitive(container.source[key] as RedactablePrimitive)),
      passThrough: () => undefined
    });
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

  private async redactAsync<T extends TraversableJson>(value: T, copyOnWrite: boolean): Promise<T> {
    const container = createContainerMutation(value as JsonObject | JsonArray, copyOnWrite);
    const customObject = this.customObjManager.getMatchingCustomObject(value);
    if (customObject && isJsonObject(value)) {
      await this.handleCustomObjectAsync(container as ContainerMutation<JsonObject>, customObject);
    } else {
      await this.redactSecretFieldsAsync(container, false);
    }

    return (copyOnWrite ? container.result() : value) as T;
  }

  private async redactSecretFieldsAsync(
    container: ContainerMutation<JsonObject | JsonArray>,
    forceDeepRedaction: boolean
  ): Promise<void> {
    const record = container.source as JsonRecord;

    for (const key of Object.keys(record)) {
      const fieldValue = record[key];
      const customObject = isJsonObject(fieldValue) ? this.customObjManager.getMatchingCustomObject(fieldValue) : undefined;
      if (customObject && isJsonObject(fieldValue)) {
        const child = createContainerMutation(fieldValue, container.copyOnWrite);
        await this.handleCustomObjectAsync(child, customObject);
        if (container.copyOnWrite) {
          container.set(key, child.result());
        }
      } else if (this.secretManager.isDeleteSecretKey(key)) {
        container.remove(key);
      } else if (this.secretManager.isFullSecretKey(key)) {
        container.set(key, await this.redactPrimitiveAsync(getStringValue(fieldValue)));
      } else if (Array.isArray(fieldValue)) {
        await this.redactArrayInObjectAsync(fieldValue, key, forceDeepRedaction, container);
      } else if (isJsonObject(fieldValue)) {
        await this.redactNestedObjectAsync(fieldValue, key, forceDeepRedaction, container);
      } else {
        container.set(key, await this.redactPrimitiveValueIfSecretAsync(key, fieldValue, forceDeepRedaction));
      }
    }
  }

  private async redactArrayInObjectAsync(
    array: JsonArray,
    key: string,
    forceDeepRedaction: boolean,
    parent: ContainerMutation<JsonObject | JsonArray>
  ): Promise<void> {
    const deepSecretKey = this.secretManager.isDeepSecretKey(key);
    const result =
      this.secretManager.isSecretKey(key) || deepSecretKey || forceDeepRedaction
        ? await this.redactAllArrayValuesAsync(array, forceDeepRedaction || deepSecretKey, parent.copyOnWrite)
        : await this.redactObjectsInArrayAsync(array, parent.copyOnWrite);
    parent.set(key, result);
  }

  private async redactObjectsInArrayAsync(array: JsonArray, copyOnWrite: boolean): Promise<JsonArray> {
    const container = createContainerMutation(array, copyOnWrite);

    for (let index = 0; index < array.length; index++) {
      const item = array[index];
      if (isJsonObject(item)) {
        const customObject = this.customObjManager.getMatchingCustomObject(item);
        const child = createContainerMutation(item, copyOnWrite);
        if (customObject) {
          await this.handleCustomObjectAsync(child, customObject);
        } else {
          await this.redactSecretFieldsAsync(child, false);
        }
        container.set(String(index), child.result());
      }
    }

    return container.result();
  }

  private async redactAllArrayValuesAsync(
    array: JsonArray,
    forceDeepRedaction: boolean,
    copyOnWrite: boolean
  ): Promise<JsonArray> {
    const container = createContainerMutation(array, copyOnWrite);

    for (let index = 0; index < array.length; index++) {
      const item = array[index];
      const key = String(index);
      if (Array.isArray(item)) {
        container.set(key, await this.redactAllArrayValuesAsync(item, forceDeepRedaction, copyOnWrite));
      } else if (!isJsonObject(item)) {
        container.set(key, await this.redactPrimitiveAsync(toRedactablePrimitive(item)));
      } else {
        const customObject = this.customObjManager.getMatchingCustomObject(item);
        const child = createContainerMutation(item, copyOnWrite);
        if (customObject) {
          await this.handleCustomObjectAsync(child, customObject);
        } else {
          await this.redactSecretFieldsAsync(child, forceDeepRedaction);
        }
        container.set(key, child.result());
      }
    }

    return container.result();
  }

  private async redactNestedObjectAsync(
    value: JsonObject,
    key: string,
    forceDeepRedaction: boolean,
    parent: ContainerMutation<JsonObject | JsonArray>
  ): Promise<void> {
    const child = createContainerMutation(value, parent.copyOnWrite);
    const customObject = this.customObjManager.getMatchingCustomObject(value);
    if (customObject) {
      await this.handleCustomObjectAsync(child, customObject);
    } else {
      await this.redactSecretFieldsAsync(child, forceDeepRedaction || this.secretManager.isDeepSecretKey(key));
    }
    if (parent.copyOnWrite) {
      parent.set(key, child.result());
    }
  }

  private async handleCustomObjectAsync(
    container: ContainerMutation<JsonObject>,
    customObject: CustomObject
  ): Promise<void> {
    for (const key of Object.keys(customObject)) {
      const fieldValue = container.source[key];
      if (Array.isArray(fieldValue)) {
        await this.handleCustomObjectValueIfArrayAsync(container, key, customObject);
      } else if (isJsonObject(fieldValue)) {
        await this.handleCustomObjectValueIfObjectAsync(container, key, customObject);
      } else {
        await this.handleCustomObjectValueIfPrimitiveAsync(container, customObject, key);
      }
    }
  }

  private async handleCustomObjectValueIfArrayAsync(
    container: ContainerMutation<JsonObject>,
    key: string,
    customObject: CustomObject
  ): Promise<void> {
    const stringKey = getStringSpecifiedCustomObjectSecretKeyValueIfExists(container.source, customObject, key);
    if (stringKey !== undefined) {
      await this.handleCustomObjectArrayValueIfStringKeySpecifiedAsync(container, key, stringKey);
    } else {
      await this.handleCustomObjectArrayValueIfMatchTypeSpecifiedAsync(
        container,
        key,
        customObject[key] as CustomObjectMatchType
      );
    }
  }

  private async handleCustomObjectArrayValueIfStringKeySpecifiedAsync(
    container: ContainerMutation<JsonObject>,
    key: string,
    stringKey: SecretSpecifierValue
  ): Promise<void> {
    const fieldValue = container.source[key];
    if (!Array.isArray(fieldValue)) {
      return;
    }

    if (this.secretManager.isDeleteSecretKey(stringKey)) {
      container.remove(key);
    } else if (this.secretManager.isFullSecretKey(stringKey)) {
      container.set(key, await this.redactPrimitiveAsync(getStringValue(fieldValue)));
    } else {
      const isDeepSecretKey = this.secretManager.isDeepSecretKey(stringKey);
      if (isDeepSecretKey || this.secretManager.isSecretKey(stringKey)) {
        container.set(
          key,
          await this.redactAllArrayValuesAsync(fieldValue, isDeepSecretKey, container.copyOnWrite)
        );
      }
    }
  }

  private async handleCustomObjectArrayValueIfMatchTypeSpecifiedAsync(
    container: ContainerMutation<JsonObject>,
    key: string,
    matchType: CustomObjectMatchType
  ): Promise<void> {
    const fieldValue = container.source[key];
    if (!Array.isArray(fieldValue)) {
      return;
    }

    await applyCustomObjectArrayMatchTypeAsync(matchType, {
      deleteKey: async () => container.remove(key),
      redactFull: async () => container.set(key, await this.redactPrimitiveAsync(getStringValue(fieldValue))),
      redactDeep: async () =>
        container.set(key, await this.redactAllArrayValuesAsync(fieldValue, true, container.copyOnWrite)),
      redactShallow: async () =>
        container.set(key, await this.redactAllArrayValuesAsync(fieldValue, false, container.copyOnWrite)),
      passThrough: async () => {
        await this.redactArrayInObjectAsync(fieldValue, key, false, container);
      }
    });
  }

  private async handleCustomObjectValueIfObjectAsync(
    container: ContainerMutation<JsonObject>,
    key: string,
    customObject: CustomObject
  ): Promise<void> {
    const stringKey = getStringSpecifiedCustomObjectSecretKeyValueIfExists(container.source, customObject, key);
    if (stringKey !== undefined) {
      await this.handleCustomObjectObjectValueIfStringKeySpecifiedAsync(container, key, stringKey);
    } else {
      await this.handleCustomObjectObjectValueIfMatchTypeSpecifiedAsync(
        container,
        key,
        customObject[key] as CustomObjectMatchType
      );
    }
  }

  private async handleCustomObjectObjectValueIfStringKeySpecifiedAsync(
    container: ContainerMutation<JsonObject>,
    key: string,
    stringKey: SecretSpecifierValue
  ): Promise<void> {
    const fieldValue = container.source[key];
    if (!isJsonObject(fieldValue)) {
      return;
    }

    const customObject = this.customObjManager.getMatchingCustomObject(fieldValue);
    if (customObject) {
      const child = createContainerMutation(fieldValue, container.copyOnWrite);
      await this.handleCustomObjectAsync(child, customObject);
      container.set(key, child.result());
    } else if (this.secretManager.isDeleteSecretKey(stringKey)) {
      container.remove(key);
    } else if (this.secretManager.isFullSecretKey(stringKey)) {
      container.set(key, await this.redactPrimitiveAsync(getStringValue(fieldValue)));
    } else if (this.secretManager.isDeepSecretKey(stringKey)) {
      const child = createContainerMutation(fieldValue, container.copyOnWrite);
      await this.redactSecretFieldsAsync(child, true);
      container.set(key, child.result());
    } else if (this.secretManager.isSecretKey(stringKey)) {
      const child = createContainerMutation(fieldValue, container.copyOnWrite);
      await this.redactSecretFieldsAsync(child, false);
      container.set(key, child.result());
    }
  }

  private async handleCustomObjectObjectValueIfMatchTypeSpecifiedAsync(
    container: ContainerMutation<JsonObject>,
    key: string,
    matchType: CustomObjectMatchType
  ): Promise<void> {
    const fieldValue = container.source[key];
    if (!isJsonObject(fieldValue)) {
      return;
    }

    await applyCustomObjectObjectMatchTypeAsync(matchType, {
      deleteKey: async () => container.remove(key),
      redactFull: async () => container.set(key, await this.redactPrimitiveAsync(getStringValue(fieldValue))),
      redactDeep: async () => {
        const child = createContainerMutation(fieldValue, container.copyOnWrite);
        await this.redactSecretFieldsAsync(child, true);
        container.set(key, child.result());
      },
      redactShallowOrPass: async () => {
        const child = createContainerMutation(fieldValue, container.copyOnWrite);
        await this.redactSecretFieldsAsync(child, false);
        container.set(key, child.result());
      },
      ignore: async () => undefined
    });
  }

  private async handleCustomObjectValueIfPrimitiveAsync(
    container: ContainerMutation<JsonObject>,
    customObject: CustomObject,
    key: string
  ): Promise<void> {
    if (typeof customObject[key] === 'number') {
      await this.handleCustomObjectPrimitiveValueIfMatchTypeSpecifiedAsync(container, key, customObject[key]);
      return;
    }

    const secretKey = getStringSpecifiedCustomObjectSecretKeyValueIfExists(container.source, customObject, key);
    if (secretKey === undefined) {
      return;
    }

    await this.handleCustomObjectPrimitiveValueIfStringKeySpecifiedAsync(container, secretKey, key);
  }

  private async handleCustomObjectPrimitiveValueIfMatchTypeSpecifiedAsync(
    container: ContainerMutation<JsonObject>,
    key: string,
    matchValue: CustomObjectMatchType
  ): Promise<void> {
    await applyCustomObjectPrimitiveMatchTypeAsync(matchValue, {
      deleteKey: async () => container.remove(key),
      redactFull: async () =>
        container.set(key, await this.redactPrimitiveAsync(getStringValue(container.source[key]))),
      redactScalar: async () =>
        container.set(key, await this.redactPrimitiveAsync(container.source[key] as RedactablePrimitive)),
      passThrough: async () => undefined
    });
  }

  private async handleCustomObjectPrimitiveValueIfStringKeySpecifiedAsync(
    container: ContainerMutation<JsonObject>,
    secretKey: SecretSpecifierValue,
    key: string
  ): Promise<void> {
    if (this.secretManager.isDeleteSecretKey(secretKey)) {
      container.remove(key);
    } else {
      container.set(
        key,
        await this.redactPrimitiveValueIfSecretAsync(secretKey, container.source[key] as RedactablePrimitive, false)
      );
    }
  }

  private async redactPrimitiveValueIfSecretAsync(
    key: SecretSpecifierValue,
    value: JsonLeafValue | undefined,
    forceDeepRedaction: boolean
  ): Promise<JsonValue | undefined> {
    return redactPrimitiveValueIfSecret(
      this.secretManager,
      this.valuePatternMatcher,
      (primitive) => this.redactPrimitiveAsync(primitive),
      key,
      value,
      forceDeepRedaction
    );
  }

  private redactPrimitiveAsync(value: RedactablePrimitive): Promise<JsonValue | undefined> {
    return this.primitiveRedactor.redactValue(value);
  }
}
