import {
  CustomObject,
  isJsonObject,
  JsonArray,
  JsonLeafValue,
  JsonObject,
  JsonRecord,
  JsonValue,
  RedactablePrimitive,
  SecretSpecifierValue,
  TraversableJson
} from '../types';
import { SecretManager } from '../rules/secretManager';
import { CustomObjectManager } from '../rules/customObjectManager';
import { PrimitiveRedactor } from './primitiveRedactor';
import { ContainerMutation, createContainerMutation } from './objectRedactorMutation';
import { ValuePatternMatcher } from '../rules/valuePatternMatcher';
import { PathRuleMatcher } from '../rules/pathRuleMatcher';
import {
  getStringValue,
  redactPrimitiveValueIfSecret,
  toRedactablePrimitive
} from './objectRedactorHelpers';
import { FieldDisposition, RuleResolver } from '../rules/ruleResolver';
import { finalizeMaybeAsync, MaybeAsync, runSequential } from '../util/maybeAsync';
import { ArrayRedactor } from './arrayRedaction';
import { CustomObjectFieldHandler } from './customObjectFieldHandler';
import { TraversalServices } from './traversalServices';

/**
 * Unified JSON traversal for in-place and copy-on-write redaction.
 * Sync and async paths share one implementation; async mode propagates Promises only when configured.
 */
export class ObjectRedactorTraversal {
  private readonly ruleResolver: RuleResolver;
  private readonly arrayRedactor: ArrayRedactor;
  private readonly customObjectHandler: CustomObjectFieldHandler;
  private readonly services: TraversalServices;

  constructor(
    private readonly primitiveRedactor: PrimitiveRedactor,
    private readonly secretManager: SecretManager,
    customObjManager: CustomObjectManager,
    private readonly valuePatternMatcher: ValuePatternMatcher,
    pathRuleMatcher: PathRuleMatcher
  ) {
    this.ruleResolver = new RuleResolver(
      secretManager,
      pathRuleMatcher,
      valuePatternMatcher,
      customObjManager
    );

    this.services = {
      get asyncMode() {
        return primitiveRedactor.usesAsyncRedactor();
      },
      ruleResolver: this.ruleResolver,
      secretManager,
      valuePatternMatcher,
      setPrimitive: (container, key, primitive) => this.setPrimitive(container, key, primitive),
      setPrimitiveFromValue: (container, key, value) => this.setPrimitiveFromValue(container, key, value),
      setPrimitiveValueIfSecret: (container, key, secretKey, value, forceDeepRedaction) =>
        this.setPrimitiveValueIfSecret(container, key, secretKey, value, forceDeepRedaction),
      redactSecretFields: (container, forceDeepRedaction, pathSegments) =>
        this.redactSecretFields(container, forceDeepRedaction, pathSegments),
      handleCustomObject: (container, customObject) => this.handleCustomObject(container, customObject),
      redactArrayInObject: (array, key, forceDeepRedaction, parent, pathSegments) =>
        this.redactArrayInObject(array, key, forceDeepRedaction, parent, pathSegments),
      redactAllArrayValues: (array, forceDeepRedaction, copyOnWrite, pathSegments) =>
        this.redactAllArrayValues(array, forceDeepRedaction, copyOnWrite, pathSegments)
    };

    this.arrayRedactor = new ArrayRedactor(this.services);
    this.customObjectHandler = new CustomObjectFieldHandler(this.services);
  }

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
    const customObject = this.ruleResolver.getMatchingSchema(value);
    const work =
      customObject && isJsonObject(value)
        ? this.handleCustomObject(container as ContainerMutation<JsonObject>, customObject)
        : this.redactSecretFields(container, false, []);

    return finalizeMaybeAsync(work, () => (copyOnWrite ? container.result() : value) as T, this.asyncMode);
  }

  private handleCustomObject(container: ContainerMutation<JsonObject>, customObject: CustomObject): MaybeAsync<void> {
    return this.customObjectHandler.handleCustomObject(container, customObject);
  }

  private redactArrayInObject(
    array: JsonArray,
    key: string,
    forceDeepRedaction: boolean,
    parent: ContainerMutation<JsonObject | JsonArray>,
    pathSegments: Array<string | number>
  ): MaybeAsync<void> {
    return this.arrayRedactor.redactArrayInObject(array, key, forceDeepRedaction, parent, pathSegments);
  }

  private redactAllArrayValues(
    array: JsonArray,
    forceDeepRedaction: boolean,
    copyOnWrite: boolean,
    pathSegments: Array<string | number>
  ): MaybeAsync<JsonArray> {
    return this.arrayRedactor.redactAllArrayValues(array, forceDeepRedaction, copyOnWrite, pathSegments);
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

    return runSequential(
      Object.keys(record),
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
    const customObject = isJsonObject(fieldValue) ? this.ruleResolver.getMatchingSchema(fieldValue) : undefined;

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

    const disposition = this.ruleResolver.resolvePathDisposition(pathSegments, key, forceDeepRedaction);
    const dispositionResult = this.applyFieldDisposition(disposition, fieldValue, key, fieldPath, container);
    if (dispositionResult instanceof Promise) {
      return dispositionResult.then((handled) =>
        handled === 'handled'
          ? undefined
          : this.applyDefaultSecretRules(fieldValue, key, forceDeepRedaction, container, fieldPath)
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
    if (this.ruleResolver.shouldRemoveByKey(key)) {
      container.remove(key);
      return;
    }

    if (this.ruleResolver.shouldOpaqueByKey(key)) {
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

  private redactNestedObject(
    value: JsonObject,
    key: string,
    forceDeepRedaction: boolean,
    parent: ContainerMutation<JsonObject | JsonArray>,
    pathSegments: Array<string | number>
  ): MaybeAsync<void> {
    const child = createContainerMutation(value, parent.copyOnWrite);
    const customObject = this.ruleResolver.getMatchingSchema(value);
    const work = customObject
      ? this.handleCustomObject(child, customObject)
      : this.redactSecretFields(
          child,
          this.ruleResolver.nestedObjectForceDeepRedaction(key, forceDeepRedaction),
          pathSegments
        );

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
