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
import { InPlaceRollback } from '../util/inPlaceRollback';
import { ValuePatternMatcher } from '../rules/valuePatternMatcher';
import { PathRuleMatcher } from '../rules/pathRuleMatcher';
import { getStringValue, redactPrimitiveValueIfSecret, toRedactablePrimitive } from './objectRedactorHelpers';
import { FieldDisposition, RuleResolver } from '../rules/ruleResolver';
import { FieldRedactionScope, redactorContextFor, rootScope, scopeForKey } from '../rules/redactorBinding';
import { finalizeMaybeAsync, MaybeAsync, runSequential } from '../util/maybeAsync';
import { ArrayRedactor } from './arrayRedaction';
import { CustomObjectFieldHandler } from './customObjectFieldHandler';
import { TraversalServices } from './traversalServices';

/**
 * Unified JSON traversal for in-place and copy-on-write redaction.
 * Sync and async paths share one implementation; async mode propagates Promises only when configured.
 * CustomObjects take highest precedence, followed by opaque (`opaqueSecretKeys`), then deep, then shallow.
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
    this.ruleResolver = new RuleResolver(secretManager, pathRuleMatcher, valuePatternMatcher, customObjManager);

    this.services = {
      ruleResolver: this.ruleResolver,
      secretManager,
      valuePatternMatcher,
      setPrimitive: (container, key, primitive, scope, secretKey) =>
        this.setPrimitive(container, key, primitive, scope, secretKey),
      setPrimitiveFromValue: (container, key, value, scope, secretKey) =>
        this.setPrimitiveFromValue(container, key, value, scope, secretKey),
      setPrimitiveValueIfSecret: (container, key, secretKey, value, forceDeepRedaction, scope) =>
        this.setPrimitiveValueIfSecret(container, key, secretKey, value, forceDeepRedaction, scope),
      redactSecretFields: (container, forceDeepRedaction, scope) =>
        this.redactSecretFields(container, forceDeepRedaction, scope),
      handleCustomObject: (container, customObject, scope) => this.handleCustomObject(container, customObject, scope),
      redactArrayInObject: (array, key, forceDeepRedaction, parent, scope) =>
        this.redactArrayInObject(array, key, forceDeepRedaction, parent, scope),
      redactAllArrayValues: (array, forceDeepRedaction, copyOnWrite, scope) =>
        this.redactAllArrayValues(array, forceDeepRedaction, copyOnWrite, scope)
    };

    this.arrayRedactor = new ArrayRedactor(this.services);
    this.customObjectHandler = new CustomObjectFieldHandler(this.services);
  }

  usesAsyncRedactor(): boolean {
    return this.primitiveRedactor.usesAsyncRedactor();
  }

  redactInPlace<T extends TraversableJson>(value: T, rollback?: InPlaceRollback): T {
    return this.asSync(this.traverseRedact(value, false, false, rollback));
  }

  redactCopyOnWrite<T extends TraversableJson>(value: T): T {
    return this.asSync(this.traverseRedact(value, true, false));
  }

  redactInPlaceAsync<T extends TraversableJson>(value: T): Promise<T> {
    return Promise.resolve(this.traverseRedact(value, false, true));
  }

  private asSync<T>(result: MaybeAsync<T>): T {
    if (result instanceof Promise) {
      throw new Error('Unexpected async work on sync traversal path');
    }

    return result;
  }

  private traverseRedact<T extends TraversableJson>(
    value: T,
    copyOnWrite: boolean,
    asyncMode: boolean,
    rollback?: InPlaceRollback
  ): MaybeAsync<T> {
    const scope = rootScope(asyncMode, copyOnWrite ? undefined : rollback);
    const container = createContainerMutation(value as JsonObject | JsonArray, copyOnWrite, scope.rollback);
    const customObject = this.ruleResolver.getMatchingSchema(value);
    const work =
      customObject && isJsonObject(value)
        ? this.handleCustomObject(container as ContainerMutation<JsonObject>, customObject, scope)
        : this.redactSecretFields(container, false, scope);

    return finalizeMaybeAsync(work, () => (copyOnWrite ? container.result() : value) as T, asyncMode);
  }

  private handleCustomObject(
    container: ContainerMutation<JsonObject>,
    customObject: CustomObject,
    scope: FieldRedactionScope
  ): MaybeAsync<void> {
    return this.customObjectHandler.handleCustomObject(container, customObject, scope);
  }

  private redactArrayInObject(
    array: JsonArray,
    key: string,
    forceDeepRedaction: boolean,
    parent: ContainerMutation<JsonObject | JsonArray>,
    scope: FieldRedactionScope
  ): MaybeAsync<void> {
    return this.arrayRedactor.redactArrayInObject(array, key, forceDeepRedaction, parent, scope);
  }

  private redactAllArrayValues(
    array: JsonArray,
    forceDeepRedaction: boolean,
    copyOnWrite: boolean,
    scope: FieldRedactionScope
  ): MaybeAsync<JsonArray> {
    return this.arrayRedactor.redactAllArrayValues(array, forceDeepRedaction, copyOnWrite, scope);
  }

  private redactPrimitive(
    value: RedactablePrimitive,
    scope: FieldRedactionScope,
    secretKey: SecretSpecifierValue
  ): MaybeAsync<JsonValue | undefined> {
    const binding = this.ruleResolver.resolveRedactorBinding(scope.pathSegments, secretKey, scope.inheritedBinding);
    const context = redactorContextFor(secretKey, scope.pathSegments);
    return scope.asyncMode
      ? this.primitiveRedactor.redactValue(value, binding, context)
      : this.primitiveRedactor.redactValueSync(value, binding, context);
  }

  private setPrimitive(
    container: ContainerMutation<JsonObject | JsonArray>,
    key: string,
    primitive: RedactablePrimitive,
    scope: FieldRedactionScope,
    secretKey: SecretSpecifierValue = key
  ): MaybeAsync<void> {
    const redacted = this.redactPrimitive(primitive, scope, secretKey);
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
    value: JsonValue | undefined,
    scope: FieldRedactionScope,
    secretKey: SecretSpecifierValue = key
  ): MaybeAsync<void> {
    return this.setPrimitive(container, key, getStringValue(value), scope, secretKey);
  }

  private chainHandled(work: MaybeAsync<void>): MaybeAsync<'handled' | 'default'> {
    if (work instanceof Promise) {
      return work.then(() => 'handled' as const);
    }

    return 'handled';
  }

  private fieldScope(scope: FieldRedactionScope, key: string): FieldRedactionScope {
    return scopeForKey(scope, key, this.ruleResolver.bindingToInherit([...scope.pathSegments, key], key));
  }

  private applyFieldDisposition(
    disposition: FieldDisposition,
    value: JsonValue | undefined,
    key: string,
    fieldScope: FieldRedactionScope,
    container: ContainerMutation<JsonObject | JsonArray>
  ): MaybeAsync<'handled' | 'default'> {
    switch (disposition.action) {
      case 'skip':
        return 'handled';
      case 'remove':
        container.remove(key);
        return 'handled';
      case 'opaque':
        return this.chainHandled(this.setPrimitiveFromValue(container, key, value, fieldScope));
      case 'deep':
        return this.chainHandled(this.redactFieldValue(value, key, true, container, fieldScope));
      case 'shallow':
        if (Array.isArray(value) || isJsonObject(value)) {
          return this.chainHandled(this.redactFieldValue(value, key, false, container, fieldScope));
        }

        return this.chainHandled(this.setPrimitive(container, key, toRedactablePrimitive(value), fieldScope));
      case 'pass-key-recurse':
        if (Array.isArray(value) || isJsonObject(value)) {
          return this.chainHandled(this.redactFieldValue(value, key, false, container, fieldScope));
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
    fieldScope: FieldRedactionScope
  ): MaybeAsync<void> {
    if (Array.isArray(value)) {
      return this.redactArrayInObject(value, key, forceDeepRedaction, container, fieldScope);
    }

    if (isJsonObject(value)) {
      return this.redactNestedObject(value, key, forceDeepRedaction, container, fieldScope);
    }

    return this.setPrimitiveValueIfSecret(container, key, key, value, forceDeepRedaction, fieldScope);
  }

  private redactSecretFields(
    container: ContainerMutation<JsonObject | JsonArray>,
    forceDeepRedaction: boolean,
    scope: FieldRedactionScope
  ): MaybeAsync<void> {
    const record = container.source as JsonRecord;

    return runSequential(
      Object.keys(record),
      (key) => this.processSecretField(record, key, forceDeepRedaction, scope, container),
      scope.asyncMode
    );
  }

  private processSecretField(
    record: JsonRecord,
    key: string,
    forceDeepRedaction: boolean,
    scope: FieldRedactionScope,
    container: ContainerMutation<JsonObject | JsonArray>
  ): MaybeAsync<void> {
    const fieldValue = record[key];
    const fieldScope = this.fieldScope(scope, key);
    const customObject = isJsonObject(fieldValue) ? this.ruleResolver.getMatchingSchema(fieldValue) : undefined;

    if (customObject && isJsonObject(fieldValue)) {
      const child = createContainerMutation(fieldValue, container.copyOnWrite, fieldScope.rollback);
      return finalizeMaybeAsync(
        this.handleCustomObject(child, customObject, fieldScope),
        () => {
          if (container.copyOnWrite) {
            container.set(key, child.result());
          }
        },
        scope.asyncMode
      );
    }

    const disposition = this.ruleResolver.resolvePathDisposition(scope.pathSegments, key, forceDeepRedaction);
    const dispositionResult = this.applyFieldDisposition(disposition, fieldValue, key, fieldScope, container);
    if (dispositionResult instanceof Promise) {
      return dispositionResult.then((handled) =>
        handled === 'handled'
          ? undefined
          : this.applyDefaultSecretRules(fieldValue, key, forceDeepRedaction, container, fieldScope)
      );
    }

    if (dispositionResult === 'handled') {
      return;
    }

    return this.applyDefaultSecretRules(fieldValue, key, forceDeepRedaction, container, fieldScope);
  }

  private applyDefaultSecretRules(
    fieldValue: JsonValue | undefined,
    key: string,
    forceDeepRedaction: boolean,
    container: ContainerMutation<JsonObject | JsonArray>,
    fieldScope: FieldRedactionScope
  ): MaybeAsync<void> {
    if (this.ruleResolver.shouldRemoveByKey(key)) {
      container.remove(key);
      return;
    }

    if (this.ruleResolver.shouldOpaqueByKey(key)) {
      return this.setPrimitiveFromValue(container, key, fieldValue, fieldScope);
    }

    if (Array.isArray(fieldValue)) {
      return this.redactArrayInObject(fieldValue, key, forceDeepRedaction, container, fieldScope);
    }

    if (isJsonObject(fieldValue)) {
      return this.redactNestedObject(fieldValue, key, forceDeepRedaction, container, fieldScope);
    }

    return this.setPrimitiveValueIfSecret(container, key, key, fieldValue, forceDeepRedaction, fieldScope);
  }

  private redactNestedObject(
    value: JsonObject,
    key: string,
    forceDeepRedaction: boolean,
    parent: ContainerMutation<JsonObject | JsonArray>,
    fieldScope: FieldRedactionScope
  ): MaybeAsync<void> {
    const child = createContainerMutation(value, parent.copyOnWrite, fieldScope.rollback);
    const customObject = this.ruleResolver.getMatchingSchema(value);
    const work = customObject
      ? this.handleCustomObject(child, customObject, fieldScope)
      : this.redactSecretFields(child, this.ruleResolver.forceDeepForKey(key, forceDeepRedaction), fieldScope);

    return finalizeMaybeAsync(
      work,
      () => {
        if (parent.copyOnWrite) {
          parent.set(key, child.result());
        }
      },
      fieldScope.asyncMode
    );
  }

  private setPrimitiveValueIfSecret(
    container: ContainerMutation<JsonObject | JsonArray>,
    key: string,
    secretKey: SecretSpecifierValue,
    value: JsonLeafValue | undefined,
    forceDeepRedaction: boolean,
    scope: FieldRedactionScope
  ): MaybeAsync<void> {
    const redacted = redactPrimitiveValueIfSecret(
      this.secretManager,
      this.valuePatternMatcher,
      (primitive) => this.redactPrimitive(primitive, scope, secretKey),
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
