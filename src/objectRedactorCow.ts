import {
  CustomObject,
  CustomObjectMatchType,
  isJsonObject,
  JsonArray,
  JsonLeafValue,
  JsonObject,
  JsonValue,
  RedactablePrimitive,
  SecretSpecifierValue,
  TraversableJson
} from './types';
import { SecretManager } from './secretManager';
import { CustomObjectManager } from './customObjectManager';
import { PrimitiveRedactor } from './primitiveRedactor';
import {
  createArrayCopyState,
  createObjectCopyState,
  deleteArrayIndex,
  deleteObjectKey,
  finishArrayCopy,
  finishObjectCopy,
  setArrayIndex,
  setObjectKey
} from './copyOnWriteHelpers';
import {
  getStringSpecifiedCustomObjectSecretKeyValueIfExists,
  getStringValue,
  redactPrimitiveValueIfSecret,
  toRedactablePrimitive
} from './objectRedactorHelpers';

/**
 * Copy-on-write JSON traversal: clones only branches that are mutated so unredacted
 * subtrees are shared with the input.
 */
export class ObjectRedactorCowTraversal {
  constructor(
    private readonly primitiveRedactor: PrimitiveRedactor,
    private readonly secretManager: SecretManager,
    private readonly customObjManager: CustomObjectManager
  ) {}

  redactCopyOnWrite<T extends TraversableJson>(value: T): T {
    const customObject = this.customObjManager.getMatchingCustomObject(value);
    if (customObject && isJsonObject(value)) {
      return this.handleCustomObject(value, customObject) as T;
    }

    return this.redactSecretObjectFields(value) as T;
  }

  private redactSecretObjectFields(object: JsonObject | JsonArray, forceDeepRedaction: boolean = false): JsonObject | JsonArray {
    if (Array.isArray(object)) {
      return this.redactSecretArrayRecord(object, forceDeepRedaction);
    }

    return this.redactSecretObjectRecord(object, forceDeepRedaction);
  }

  private redactSecretArrayRecord(array: JsonArray, forceDeepRedaction: boolean): JsonArray {
    const state = createArrayCopyState(array);

    for (const key of Object.keys(array)) {
      const index = Number(key);
      const value = array[index];
      const customObject = isJsonObject(value) ? this.customObjManager.getMatchingCustomObject(value) : undefined;
      if (customObject && isJsonObject(value)) {
        setArrayIndex(state, index, this.handleCustomObject(value, customObject));
      } else if (this.secretManager.isDeleteSecretKey(key)) {
        deleteArrayIndex(state, index);
      } else if (this.secretManager.isFullSecretKey(key)) {
        setArrayIndex(state, index, this.redactPrimitive(getStringValue(value)));
      } else if (Array.isArray(value)) {
        setArrayIndex(state, index, this.redactArrayInObject(value, key, forceDeepRedaction));
      } else if (isJsonObject(value)) {
        setArrayIndex(state, index, this.redactNestedObject(value, key, forceDeepRedaction));
      } else {
        setArrayIndex(state, index, this.redactPrimitiveValueIfSecret(key, value, forceDeepRedaction));
      }
    }

    return finishArrayCopy(state);
  }

  private redactSecretObjectRecord(object: JsonObject, forceDeepRedaction: boolean): JsonObject {
    const state = createObjectCopyState(object);

    for (const key of Object.keys(object)) {
      const value = object[key];
      const customObject = isJsonObject(value) ? this.customObjManager.getMatchingCustomObject(value) : undefined;
      if (customObject && isJsonObject(value)) {
        setObjectKey(state, key, this.handleCustomObject(value, customObject));
      } else if (this.secretManager.isDeleteSecretKey(key)) {
        deleteObjectKey(state, key);
      } else if (this.secretManager.isFullSecretKey(key)) {
        setObjectKey(state, key, this.redactPrimitive(getStringValue(value)));
      } else if (Array.isArray(value)) {
        setObjectKey(state, key, this.redactArrayInObject(value, key, forceDeepRedaction));
      } else if (isJsonObject(value)) {
        setObjectKey(state, key, this.redactNestedObject(value, key, forceDeepRedaction));
      } else {
        setObjectKey(state, key, this.redactPrimitiveValueIfSecret(key, value, forceDeepRedaction));
      }
    }

    return finishObjectCopy(state);
  }

  private redactArrayInObject(array: JsonArray, key: string, forceDeepRedaction: boolean): JsonArray {
    const deepSecretKey = this.secretManager.isDeepSecretKey(key);
    if (this.secretManager.isSecretKey(key) || deepSecretKey || forceDeepRedaction) {
      return this.redactAllArrayValues(array, forceDeepRedaction || deepSecretKey);
    }

    return this.redactObjectsInArray(array);
  }

  private redactObjectsInArray(array: JsonArray): JsonArray {
    const state = createArrayCopyState(array);

    for (let index = 0; index < array.length; index++) {
      const value = array[index];
      if (isJsonObject(value)) {
        const customObject = this.customObjManager.getMatchingCustomObject(value);
        if (customObject) {
          setArrayIndex(state, index, this.handleCustomObject(value, customObject));
        } else {
          setArrayIndex(state, index, this.redactSecretObjectRecord(value, false));
        }
      }
    }

    return finishArrayCopy(state);
  }

  private redactAllArrayValues(array: JsonArray, forceDeepRedaction: boolean): JsonArray {
    const state = createArrayCopyState(array);

    for (let index = 0; index < array.length; index++) {
      const value = array[index];
      if (Array.isArray(value)) {
        setArrayIndex(state, index, this.redactAllArrayValues(value, forceDeepRedaction));
      } else if (!isJsonObject(value)) {
        setArrayIndex(state, index, this.redactPrimitive(toRedactablePrimitive(value)));
      } else {
        const customObject = this.customObjManager.getMatchingCustomObject(value);
        if (customObject) {
          setArrayIndex(state, index, this.handleCustomObject(value, customObject));
        } else {
          setArrayIndex(state, index, this.redactSecretObjectRecord(value, forceDeepRedaction));
        }
      }
    }

    return finishArrayCopy(state);
  }

  private redactNestedObject(value: JsonObject, key: string, forceDeepRedaction: boolean): JsonObject {
    const customObject = this.customObjManager.getMatchingCustomObject(value);
    if (customObject) {
      return this.handleCustomObject(value, customObject);
    }

    return this.redactSecretObjectRecord(value, forceDeepRedaction || this.secretManager.isDeepSecretKey(key));
  }

  private handleCustomObject(value: JsonObject, customObject: CustomObject): JsonObject {
    const state = createObjectCopyState(value);

    for (const key of Object.keys(customObject)) {
      const fieldValue = value[key];
      if (Array.isArray(fieldValue)) {
        this.handleCustomObjectValueIfArray(state, key, customObject);
      } else if (isJsonObject(fieldValue)) {
        this.handleCustomObjectValueIfObject(state, key, customObject);
      } else {
        this.handleCustomObjectValueIfPrimitive(state, customObject, key);
      }
    }

    return finishObjectCopy(state);
  }

  private handleCustomObjectValueIfArray(state: ReturnType<typeof createObjectCopyState>, key: string, customObject: CustomObject): void {
    const stringKey = getStringSpecifiedCustomObjectSecretKeyValueIfExists(state.source, customObject, key);
    if (stringKey !== undefined) {
      this.handleCustomObjectArrayValueIfStringKeySpecified(state, key, stringKey);
    } else {
      this.handleCustomObjectArrayValueIfMatchTypeSpecified(state, key, customObject[key] as CustomObjectMatchType);
    }
  }

  private handleCustomObjectArrayValueIfStringKeySpecified(
    state: ReturnType<typeof createObjectCopyState>,
    key: string,
    stringKey: SecretSpecifierValue
  ): void {
    const fieldValue = state.source[key];
    if (!Array.isArray(fieldValue)) {
      return;
    }

    if (this.secretManager.isDeleteSecretKey(stringKey)) {
      deleteObjectKey(state, key);
    } else if (this.secretManager.isFullSecretKey(stringKey)) {
      setObjectKey(state, key, this.redactPrimitive(getStringValue(fieldValue)));
    } else {
      const isDeepSecretKey = this.secretManager.isDeepSecretKey(stringKey);
      if (isDeepSecretKey || this.secretManager.isSecretKey(stringKey)) {
        setObjectKey(state, key, this.redactAllArrayValues(fieldValue, isDeepSecretKey));
      }
    }
  }

  private handleCustomObjectArrayValueIfMatchTypeSpecified(
    state: ReturnType<typeof createObjectCopyState>,
    key: string,
    matchType: CustomObjectMatchType
  ): void {
    const fieldValue = state.source[key];
    if (!Array.isArray(fieldValue)) {
      return;
    }

    switch (matchType) {
      case CustomObjectMatchType.Delete:
        deleteObjectKey(state, key);
        return;
      case CustomObjectMatchType.Full:
        setObjectKey(state, key, this.redactPrimitive(getStringValue(fieldValue)));
        return;
      case CustomObjectMatchType.Deep:
        setObjectKey(state, key, this.redactAllArrayValues(fieldValue, true));
        return;
      case CustomObjectMatchType.Shallow:
        setObjectKey(state, key, this.redactAllArrayValues(fieldValue, false));
        return;
      case CustomObjectMatchType.Pass:
        setObjectKey(state, key, this.redactArrayInObject(fieldValue, key, false));
      default:
        return;
    }
  }

  private handleCustomObjectValueIfObject(state: ReturnType<typeof createObjectCopyState>, key: string, customObject: CustomObject): void {
    const stringKey = getStringSpecifiedCustomObjectSecretKeyValueIfExists(state.source, customObject, key);
    if (stringKey !== undefined) {
      this.handleCustomObjectObjectValueIfStringKeySpecified(state, key, stringKey);
    } else {
      this.handleCustomObjectObjectValueIfMatchTypeSpecified(state, key, customObject[key] as CustomObjectMatchType);
    }
  }

  private handleCustomObjectObjectValueIfStringKeySpecified(
    state: ReturnType<typeof createObjectCopyState>,
    key: string,
    stringKey: SecretSpecifierValue
  ): void {
    const fieldValue = state.source[key];
    if (!isJsonObject(fieldValue)) {
      return;
    }

    const customObject = this.customObjManager.getMatchingCustomObject(fieldValue);
    if (customObject) {
      setObjectKey(state, key, this.handleCustomObject(fieldValue, customObject));
    } else if (this.secretManager.isDeleteSecretKey(stringKey)) {
      deleteObjectKey(state, key);
    } else if (this.secretManager.isFullSecretKey(stringKey)) {
      setObjectKey(state, key, this.redactPrimitive(getStringValue(fieldValue)));
    } else if (this.secretManager.isDeepSecretKey(stringKey)) {
      setObjectKey(state, key, this.redactSecretObjectRecord(fieldValue, true));
    } else if (this.secretManager.isSecretKey(stringKey)) {
      setObjectKey(state, key, this.redactSecretObjectRecord(fieldValue, false));
    }
  }

  private handleCustomObjectObjectValueIfMatchTypeSpecified(
    state: ReturnType<typeof createObjectCopyState>,
    key: string,
    matchType: CustomObjectMatchType
  ): void {
    const fieldValue = state.source[key];
    if (!isJsonObject(fieldValue)) {
      return;
    }

    switch (matchType) {
      case CustomObjectMatchType.Delete:
        deleteObjectKey(state, key);
        return;
      case CustomObjectMatchType.Full:
        setObjectKey(state, key, this.redactPrimitive(getStringValue(fieldValue)));
        return;
      case CustomObjectMatchType.Deep:
        setObjectKey(state, key, this.redactSecretObjectRecord(fieldValue, true));
        return;
      case CustomObjectMatchType.Shallow:
      case CustomObjectMatchType.Pass:
        setObjectKey(state, key, this.redactSecretObjectRecord(fieldValue, false));
        return;
      case CustomObjectMatchType.Ignore:
        return;
    }
  }

  private handleCustomObjectValueIfPrimitive(
    state: ReturnType<typeof createObjectCopyState>,
    customObject: CustomObject,
    key: string
  ): void {
    if (typeof customObject[key] === 'number') {
      this.handleCustomObjectPrimitiveValueIfMatchTypeSpecified(state, key, customObject[key]);
      return;
    }

    const secretKey = getStringSpecifiedCustomObjectSecretKeyValueIfExists(state.source, customObject, key);
    if (secretKey === undefined) {
      return;
    }

    this.handleCustomObjectPrimitiveValueIfStringKeySpecified(state, secretKey, key);
  }

  private handleCustomObjectPrimitiveValueIfMatchTypeSpecified(
    state: ReturnType<typeof createObjectCopyState>,
    key: string,
    matchValue: CustomObjectMatchType
  ): void {
    switch (matchValue) {
      case CustomObjectMatchType.Delete:
        deleteObjectKey(state, key);
        return;
      case CustomObjectMatchType.Full:
        setObjectKey(state, key, this.redactPrimitive(getStringValue(state.source[key])));
        return;
      case CustomObjectMatchType.Deep:
      case CustomObjectMatchType.Shallow:
        setObjectKey(state, key, this.redactPrimitive(state.source[key] as RedactablePrimitive));
        return;
      case CustomObjectMatchType.Pass:
      default:
        return;
    }
  }

  private handleCustomObjectPrimitiveValueIfStringKeySpecified(
    state: ReturnType<typeof createObjectCopyState>,
    secretKey: SecretSpecifierValue,
    key: string
  ): void {
    if (this.secretManager.isDeleteSecretKey(secretKey)) {
      deleteObjectKey(state, key);
    } else {
      setObjectKey(
        state,
        key,
        this.redactPrimitiveValueIfSecret(secretKey, state.source[key] as RedactablePrimitive, false)
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
