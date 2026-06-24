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
import { PathRuleMatcher } from './pathRuleMatcher';
import {
  getStringSpecifiedCustomObjectSecretKeyValueIfExists,
  getStringValue,
  redactPrimitiveValueIfSecret,
  toRedactablePrimitive
} from './objectRedactorHelpers';
import {
  applyCustomObjectArrayMatchType,
  applyCustomObjectObjectMatchType,
  applyCustomObjectPrimitiveMatchType
} from './objectRedactorCustomObject';
import { FieldDisposition, resolveFieldDisposition } from './fieldDisposition';
import { finalizeMaybeAsync, MaybeAsync, resolveMaybeAsync, runSequential } from './maybeAsync';

/**
 * Unified JSON traversal for in-place and copy-on-write redaction.
 * Sync and async paths share one implementation; async mode propagates Promises only when configured.
 */
export class ObjectRedactorTraversal {
  constructor(
    private readonly primitiveRedactor: PrimitiveRedactor,
    private readonly secretManager: SecretManager,
    private readonly customObjManager: CustomObjectManager,
    private readonly valuePatternMatcher: ValuePatternMatcher,
    private readonly pathRuleMatcher: PathRuleMatcher
  ) {}

  usesAsyncRedactor(): boolean {
    return this.primitiveRedactor.usesAsyncRedactor();
  }

  redactInPlace<T extends TraversableJson>(value: T): T {
    const result = this.traverseRedact(value, false);
    if (result instanceof Promise) {
      throw new Error('Unexpected async work on sync traversal path');
    }

    return result;
  }

  redactCopyOnWrite<T extends TraversableJson>(value: T): T {
    const result = this.traverseRedact(value, true);
    if (result instanceof Promise) {
      throw new Error('Unexpected async work on sync traversal path');
    }

    return result;
  }

  redactInPlaceAsync<T extends TraversableJson>(value: T): Promise<T> {
    return Promise.resolve(this.traverseRedact(value, false));
  }

  private get asyncMode(): boolean {
    return this.primitiveRedactor.usesAsyncRedactor();
  }

  private traverseRedact<T extends TraversableJson>(value: T, copyOnWrite: boolean): MaybeAsync<T> {
    const container = createContainerMutation(value as JsonObject | JsonArray, copyOnWrite);
    const customObject = this.customObjManager.getMatchingCustomObject(value);
    const work =
      customObject && isJsonObject(value)
        ? this.handleCustomObject(container as ContainerMutation<JsonObject>, customObject)
        : this.redactSecretFields(container, false, []);

    return finalizeMaybeAsync(work, () => (copyOnWrite ? container.result() : value) as T, this.asyncMode);
  }

  private resolveFieldDisposition(
    key: string,
    pathSegments: Array<string | number>,
    forceDeepRedaction: boolean
  ): FieldDisposition {
    return resolveFieldDisposition(this.secretManager, this.pathRuleMatcher, key, pathSegments, forceDeepRedaction);
  }

  private redactPrimitive(value: RedactablePrimitive): MaybeAsync<JsonValue | undefined> {
    return this.asyncMode ? this.primitiveRedactor.redactValue(value) : this.primitiveRedactor.redactValueSync(value);
  }

  private setPrimitive(
    container: ContainerMutation<JsonObject | JsonArray>,
    key: string,
    primitive: RedactablePrimitive
  ): MaybeAsync<void> {
    const redacted = this.redactPrimitive(primitive);
    if (redacted instanceof Promise) {
      return redacted.then((result) => {
        container.set(key, result);
      });
    }

    container.set(key, redacted);
  }

  private setPrimitiveFromValue(
    container: ContainerMutation<JsonObject | JsonArray>,
    key: string,
    value: JsonValue | undefined
  ): MaybeAsync<void> {
    return this.setPrimitive(container, key, getStringValue(value));
  }

  private chainHandled(work: MaybeAsync<void>): MaybeAsync<'handled' | 'default'> {
    if (work instanceof Promise) {
      return work.then(() => 'handled' as const);
    }

    return 'handled';
  }

  private applyFieldDisposition(
    disposition: FieldDisposition,
    value: JsonValue | undefined,
    key: string,
    fieldPath: Array<string | number>,
    container: ContainerMutation<JsonObject | JsonArray>
  ): MaybeAsync<'handled' | 'default'> {
    switch (disposition.action) {
      case 'skip':
        return 'handled';
      case 'remove':
        container.remove(key);
        return 'handled';
      case 'opaque':
        return this.chainHandled(this.setPrimitiveFromValue(container, key, value));
      case 'deep':
        return this.chainHandled(this.redactFieldValue(value, key, true, container, fieldPath));
      case 'shallow':
        if (Array.isArray(value) || isJsonObject(value)) {
          return this.chainHandled(this.redactFieldValue(value, key, false, container, fieldPath));
        }

        return this.chainHandled(this.setPrimitive(container, key, toRedactablePrimitive(value)));
      case 'pass-key-recurse':
        if (Array.isArray(value) || isJsonObject(value)) {
          return this.chainHandled(this.redactFieldValue(value, key, false, container, fieldPath));
        }

        return 'handled';
      default:
        return 'default';
    }
  }

  private redactFieldValue(
    value: JsonValue | undefined,
    key: string,
    forceDeepRedaction: boolean,
    container: ContainerMutation<JsonObject | JsonArray>,
    fieldPath: Array<string | number>
  ): MaybeAsync<void> {
    if (Array.isArray(value)) {
      return this.redactArrayInObject(value, key, forceDeepRedaction, container, fieldPath);
    }

    if (isJsonObject(value)) {
      return this.redactNestedObject(value, key, forceDeepRedaction, container, fieldPath);
    }

    return this.setPrimitiveValueIfSecret(container, key, key, value, forceDeepRedaction);
  }

  private redactSecretFields(
    container: ContainerMutation<JsonObject | JsonArray>,
    forceDeepRedaction: boolean,
    pathSegments: Array<string | number>
  ): MaybeAsync<void> {
    const record = container.source as JsonRecord;
    const keys = Object.keys(record);

    return runSequential(
      keys,
      (key) => this.processSecretField(record, key, forceDeepRedaction, pathSegments, container),
      this.asyncMode
    );
  }

  private processSecretField(
    record: JsonRecord,
    key: string,
    forceDeepRedaction: boolean,
    pathSegments: Array<string | number>,
    container: ContainerMutation<JsonObject | JsonArray>
  ): MaybeAsync<void> {
    const fieldValue = record[key];
    const fieldPath = [...pathSegments, key];
    const customObject = isJsonObject(fieldValue) ? this.customObjManager.getMatchingCustomObject(fieldValue) : undefined;

    if (customObject && isJsonObject(fieldValue)) {
      const child = createContainerMutation(fieldValue, container.copyOnWrite);
      return finalizeMaybeAsync(
        this.handleCustomObject(child, customObject),
        () => {
          if (container.copyOnWrite) {
            container.set(key, child.result());
          }
        },
        this.asyncMode
      );
    }

    const disposition = this.resolveFieldDisposition(key, pathSegments, forceDeepRedaction);
    const dispositionResult = this.applyFieldDisposition(disposition, fieldValue, key, fieldPath, container);
    if (dispositionResult instanceof Promise) {
      return dispositionResult.then((handled) =>
        handled === 'handled' ? undefined : this.applyDefaultSecretRules(fieldValue, key, forceDeepRedaction, container, fieldPath)
      );
    }

    if (dispositionResult === 'handled') {
      return;
    }

    return this.applyDefaultSecretRules(fieldValue, key, forceDeepRedaction, container, fieldPath);
  }

  private applyDefaultSecretRules(
    fieldValue: JsonValue | undefined,
    key: string,
    forceDeepRedaction: boolean,
    container: ContainerMutation<JsonObject | JsonArray>,
    fieldPath: Array<string | number>
  ): MaybeAsync<void> {
    if (this.secretManager.isDeleteSecretKey(key)) {
      container.remove(key);
      return;
    }

    if (this.secretManager.isFullSecretKey(key)) {
      return this.setPrimitiveFromValue(container, key, fieldValue);
    }

    if (Array.isArray(fieldValue)) {
      return this.redactArrayInObject(fieldValue, key, forceDeepRedaction, container, fieldPath);
    }

    if (isJsonObject(fieldValue)) {
      return this.redactNestedObject(fieldValue, key, forceDeepRedaction, container, fieldPath);
    }

    return this.setPrimitiveValueIfSecret(container, key, key, fieldValue, forceDeepRedaction);
  }

  private redactArrayInObject(
    array: JsonArray,
    key: string,
    forceDeepRedaction: boolean,
    parent: ContainerMutation<JsonObject | JsonArray>,
    pathSegments: Array<string | number>
  ): MaybeAsync<void> {
    const deepSecretKey = this.secretManager.isDeepSecretKey(key);
    const redacted =
      this.secretManager.isSecretKey(key) || deepSecretKey || forceDeepRedaction
        ? this.redactAllArrayValues(array, forceDeepRedaction || deepSecretKey, parent.copyOnWrite, pathSegments)
        : this.redactObjectsInArray(array, parent.copyOnWrite, pathSegments);

    if (redacted instanceof Promise) {
      return redacted.then((result) => {
        parent.set(key, result);
      });
    }

    parent.set(key, redacted);
  }

  private redactObjectsInArray(
    array: JsonArray,
    copyOnWrite: boolean,
    pathSegments: Array<string | number>
  ): MaybeAsync<JsonArray> {
    const container = createContainerMutation(array, copyOnWrite);

    const work = runSequential(
      array,
      (item, index) => {
        if (!isJsonObject(item)) {
          return;
        }

        const customObject = this.customObjManager.getMatchingCustomObject(item);
        const child = createContainerMutation(item, copyOnWrite);
        const itemPath = [...pathSegments, index];
        return finalizeMaybeAsync(
          customObject ? this.handleCustomObject(child, customObject) : this.redactSecretFields(child, false, itemPath),
          () => {
            container.set(String(index), child.result());
          },
          this.asyncMode
        );
      },
      this.asyncMode
    );

    return finalizeMaybeAsync(work, () => container.result(), this.asyncMode);
  }

  private redactAllArrayValues(
    array: JsonArray,
    forceDeepRedaction: boolean,
    copyOnWrite: boolean,
    pathSegments: Array<string | number>
  ): MaybeAsync<JsonArray> {
    const container = createContainerMutation(array, copyOnWrite);

    const work = runSequential(
      array,
      (item, index) => {
        const key = String(index);
        const itemPath = [...pathSegments, index];

        if (Array.isArray(item)) {
          const nested = this.redactAllArrayValues(item, forceDeepRedaction, copyOnWrite, itemPath);
          if (nested instanceof Promise) {
            return nested.then((result) => {
              container.set(key, result);
            });
          }

          container.set(key, nested);
          return;
        }

        if (!isJsonObject(item)) {
          return this.setPrimitive(container, key, toRedactablePrimitive(item));
        }

        const customObject = this.customObjManager.getMatchingCustomObject(item);
        const child = createContainerMutation(item, copyOnWrite);
        return finalizeMaybeAsync(
          customObject
            ? this.handleCustomObject(child, customObject)
            : this.redactSecretFields(child, forceDeepRedaction, itemPath),
          () => {
            container.set(key, child.result());
          },
          this.asyncMode
        );
      },
      this.asyncMode
    );

    return finalizeMaybeAsync(work, () => container.result(), this.asyncMode);
  }

  private redactNestedObject(
    value: JsonObject,
    key: string,
    forceDeepRedaction: boolean,
    parent: ContainerMutation<JsonObject | JsonArray>,
    pathSegments: Array<string | number>
  ): MaybeAsync<void> {
    const child = createContainerMutation(value, parent.copyOnWrite);
    const customObject = this.customObjManager.getMatchingCustomObject(value);
    const work = customObject
      ? this.handleCustomObject(child, customObject)
      : this.redactSecretFields(child, forceDeepRedaction || this.secretManager.isDeepSecretKey(key), pathSegments);

    return finalizeMaybeAsync(
      work,
      () => {
        if (parent.copyOnWrite) {
          parent.set(key, child.result());
        }
      },
      this.asyncMode
    );
  }

  private handleCustomObject(
    container: ContainerMutation<JsonObject>,
    customObject: CustomObject
  ): MaybeAsync<void> {
    return runSequential(
      Object.keys(customObject),
      (key) => {
        const fieldValue = container.source[key];
        if (Array.isArray(fieldValue)) {
          return this.handleCustomObjectValueIfArray(container, key, customObject);
        }

        if (isJsonObject(fieldValue)) {
          return this.handleCustomObjectValueIfObject(container, key, customObject);
        }

        return this.handleCustomObjectValueIfPrimitive(container, customObject, key);
      },
      this.asyncMode
    );
  }

  private handleCustomObjectValueIfArray(
    container: ContainerMutation<JsonObject>,
    key: string,
    customObject: CustomObject
  ): MaybeAsync<void> {
    const stringKey = getStringSpecifiedCustomObjectSecretKeyValueIfExists(container.source, customObject, key);
    if (stringKey !== undefined) {
      return this.handleCustomObjectArrayValueIfStringKeySpecified(container, key, stringKey);
    }

    return this.handleCustomObjectArrayValueIfMatchTypeSpecified(
      container,
      key,
      customObject[key] as CustomObjectMatchType
    );
  }

  private handleCustomObjectArrayValueIfStringKeySpecified(
    container: ContainerMutation<JsonObject>,
    key: string,
    stringKey: SecretSpecifierValue
  ): MaybeAsync<void> {
    const fieldValue = container.source[key];
    if (!Array.isArray(fieldValue)) {
      return;
    }

    if (this.secretManager.isDeleteSecretKey(stringKey)) {
      container.remove(key);
      return;
    }

    if (this.secretManager.isFullSecretKey(stringKey)) {
      return this.setPrimitiveFromValue(container, key, fieldValue);
    }

    const isDeepSecretKey = this.secretManager.isDeepSecretKey(stringKey);
    if (!isDeepSecretKey && !this.secretManager.isSecretKey(stringKey)) {
      return;
    }

    const redacted = this.redactAllArrayValues(fieldValue, isDeepSecretKey, container.copyOnWrite, []);
    if (redacted instanceof Promise) {
      return redacted.then((result) => {
        container.set(key, result);
      });
    }

    container.set(key, redacted);
  }

  private handleCustomObjectArrayValueIfMatchTypeSpecified(
    container: ContainerMutation<JsonObject>,
    key: string,
    matchType: CustomObjectMatchType
  ): MaybeAsync<void> {
    const fieldValue = container.source[key];
    if (!Array.isArray(fieldValue)) {
      return;
    }

    return resolveMaybeAsync(
      applyCustomObjectArrayMatchType(matchType, {
        deleteKey: () => container.remove(key),
        redactFull: () => this.setPrimitiveFromValue(container, key, fieldValue),
        redactDeep: () => this.setRedactedArray(container, key, fieldValue, true),
        redactShallow: () => this.setRedactedArray(container, key, fieldValue, false),
        passThrough: () => this.redactArrayInObject(fieldValue, key, false, container, [])
      }),
      this.asyncMode
    );
  }

  private setRedactedArray(
    container: ContainerMutation<JsonObject>,
    key: string,
    fieldValue: JsonArray,
    forceDeepRedaction: boolean
  ): MaybeAsync<void> {
    const redacted = this.redactAllArrayValues(fieldValue, forceDeepRedaction, container.copyOnWrite, []);
    if (redacted instanceof Promise) {
      return redacted.then((result) => {
        container.set(key, result);
      });
    }

    container.set(key, redacted);
  }

  private handleCustomObjectValueIfObject(
    container: ContainerMutation<JsonObject>,
    key: string,
    customObject: CustomObject
  ): MaybeAsync<void> {
    const stringKey = getStringSpecifiedCustomObjectSecretKeyValueIfExists(container.source, customObject, key);
    if (stringKey !== undefined) {
      return this.handleCustomObjectObjectValueIfStringKeySpecified(container, key, stringKey);
    }

    return this.handleCustomObjectObjectValueIfMatchTypeSpecified(
      container,
      key,
      customObject[key] as CustomObjectMatchType
    );
  }

  private handleCustomObjectObjectValueIfStringKeySpecified(
    container: ContainerMutation<JsonObject>,
    key: string,
    stringKey: SecretSpecifierValue
  ): MaybeAsync<void> {
    const fieldValue = container.source[key];
    if (!isJsonObject(fieldValue)) {
      return;
    }

    const customObject = this.customObjManager.getMatchingCustomObject(fieldValue);
    if (customObject) {
      const child = createContainerMutation(fieldValue, container.copyOnWrite);
      return finalizeMaybeAsync(
        this.handleCustomObject(child, customObject),
        () => {
          container.set(key, child.result());
        },
        this.asyncMode
      );
    }

    if (this.secretManager.isDeleteSecretKey(stringKey)) {
      container.remove(key);
      return;
    }

    if (this.secretManager.isFullSecretKey(stringKey)) {
      return this.setPrimitiveFromValue(container, key, fieldValue);
    }

    const forceDeep = this.secretManager.isDeepSecretKey(stringKey);
    if (!forceDeep && !this.secretManager.isSecretKey(stringKey)) {
      return;
    }

    const child = createContainerMutation(fieldValue, container.copyOnWrite);
    return finalizeMaybeAsync(
      this.redactSecretFields(child, forceDeep, []),
      () => {
        container.set(key, child.result());
      },
      this.asyncMode
    );
  }

  private handleCustomObjectObjectValueIfMatchTypeSpecified(
    container: ContainerMutation<JsonObject>,
    key: string,
    matchType: CustomObjectMatchType
  ): MaybeAsync<void> {
    const fieldValue = container.source[key];
    if (!isJsonObject(fieldValue)) {
      return;
    }

    return resolveMaybeAsync(
      applyCustomObjectObjectMatchType(matchType, {
        deleteKey: () => container.remove(key),
        redactFull: () => this.setPrimitiveFromValue(container, key, fieldValue),
        redactDeep: () => this.setRedactedObject(container, key, fieldValue, true),
        redactShallowOrPass: () => this.setRedactedObject(container, key, fieldValue, false),
        ignore: () => undefined
      }),
      this.asyncMode
    );
  }

  private setRedactedObject(
    container: ContainerMutation<JsonObject>,
    key: string,
    fieldValue: JsonObject,
    forceDeepRedaction: boolean
  ): MaybeAsync<void> {
    const child = createContainerMutation(fieldValue, container.copyOnWrite);
    return finalizeMaybeAsync(
      this.redactSecretFields(child, forceDeepRedaction, []),
      () => {
        container.set(key, child.result());
      },
      this.asyncMode
    );
  }

  private handleCustomObjectValueIfPrimitive(
    container: ContainerMutation<JsonObject>,
    customObject: CustomObject,
    key: string
  ): MaybeAsync<void> {
    if (typeof customObject[key] === 'number') {
      return this.handleCustomObjectPrimitiveValueIfMatchTypeSpecified(container, key, customObject[key]);
    }

    const secretKey = getStringSpecifiedCustomObjectSecretKeyValueIfExists(container.source, customObject, key);
    if (secretKey === undefined) {
      return;
    }

    return this.handleCustomObjectPrimitiveValueIfStringKeySpecified(container, secretKey, key);
  }

  private handleCustomObjectPrimitiveValueIfMatchTypeSpecified(
    container: ContainerMutation<JsonObject>,
    key: string,
    matchValue: CustomObjectMatchType
  ): MaybeAsync<void> {
    return resolveMaybeAsync(
      applyCustomObjectPrimitiveMatchType(matchValue, {
        deleteKey: () => container.remove(key),
        redactFull: () => this.setPrimitiveFromValue(container, key, container.source[key]),
        redactScalar: () => this.setPrimitive(container, key, container.source[key] as RedactablePrimitive),
        passThrough: () => undefined
      }),
      this.asyncMode
    );
  }

  private handleCustomObjectPrimitiveValueIfStringKeySpecified(
    container: ContainerMutation<JsonObject>,
    secretKey: SecretSpecifierValue,
    key: string
  ): MaybeAsync<void> {
    if (this.secretManager.isDeleteSecretKey(secretKey)) {
      container.remove(key);
      return;
    }

    return this.setPrimitiveValueIfSecret(
      container,
      key,
      secretKey,
      container.source[key] as RedactablePrimitive,
      false
    );
  }

  private setPrimitiveValueIfSecret(
    container: ContainerMutation<JsonObject | JsonArray>,
    key: string,
    secretKey: SecretSpecifierValue,
    value: JsonLeafValue | undefined,
    forceDeepRedaction: boolean
  ): MaybeAsync<void> {
    const redacted = redactPrimitiveValueIfSecret(
      this.secretManager,
      this.valuePatternMatcher,
      (primitive) => this.redactPrimitive(primitive),
      secretKey,
      value,
      forceDeepRedaction
    );

    if (redacted instanceof Promise) {
      return redacted.then((result) => {
        container.set(key, result);
      });
    }

    container.set(key, redacted);
  }
}
