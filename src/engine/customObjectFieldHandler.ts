import {
  CustomObject,
  CustomObjectMatchType,
  isJsonObject,
  JsonArray,
  JsonObject,
  JsonValue,
  RedactablePrimitive,
  SecretSpecifierValue
} from '../types';
import { ContainerMutation, createContainerMutation } from './objectRedactorMutation';
import { applyCustomObjectMatchType } from './objectRedactorCustomObject';
import { getStringSpecifiedCustomObjectSecretKeyValueIfExists } from '../rules/schemaSiblingKey';
import { finalizeMaybeAsync, MaybeAsync, resolveMaybeAsync, runSequential } from '../util/maybeAsync';
import { TraversalServices } from './traversalServices';
import { SecretManager } from '../rules/secretManager';

type StringKeyAction =
  | { type: 'remove' }
  | { type: 'opaque' }
  | { type: 'traverse'; forceDeep: boolean }
  | { type: 'none' };

type ValueShape = 'array' | 'object' | 'primitive';

/** Shared delete/opaque/deep/shallow ladder for schema sibling-key rules. */
export const resolveCustomObjectStringKeyAction = (
  secretManager: SecretManager,
  stringKey: SecretSpecifierValue
): StringKeyAction => {
  switch (secretManager.classifyKeyRule(stringKey)) {
    case 'remove':
      return { type: 'remove' };
    case 'opaque':
      return { type: 'opaque' };
    case 'deep':
      return { type: 'traverse', forceDeep: true };
    case 'shallow':
    case 'default':
      return { type: 'traverse', forceDeep: false };
    default:
      return { type: 'none' };
  }
};

const shapeOf = (value: JsonValue | undefined): ValueShape => {
  if (Array.isArray(value)) {
    return 'array';
  }
  if (isJsonObject(value)) {
    return 'object';
  }
  return 'primitive';
};

export class CustomObjectFieldHandler {
  constructor(private readonly services: TraversalServices) {}

  handleCustomObject(container: ContainerMutation<JsonObject>, customObject: CustomObject): MaybeAsync<void> {
    return runSequential(
      Object.keys(customObject),
      (key) => this.handleField(container, key, customObject),
      this.services.asyncMode
    );
  }

  private handleField(
    container: ContainerMutation<JsonObject>,
    key: string,
    customObject: CustomObject
  ): MaybeAsync<void> {
    const fieldValue = container.source[key];
    const shape = shapeOf(fieldValue);
    const stringKey = getStringSpecifiedCustomObjectSecretKeyValueIfExists(container.source, customObject, key);

    if (stringKey !== undefined) {
      return this.applyStringKeyRule(container, key, stringKey, shape);
    }

    if (typeof customObject[key] === 'number') {
      return this.applyMatchTypeRule(container, key, customObject[key], shape);
    }

    return undefined;
  }

  private applyStringKeyRule(
    container: ContainerMutation<JsonObject>,
    key: string,
    stringKey: SecretSpecifierValue,
    shape: ValueShape
  ): MaybeAsync<void> {
    if (shape === 'primitive') {
      const action = resolveCustomObjectStringKeyAction(this.services.secretManager, stringKey);
      if (action.type === 'remove') {
        container.remove(key);
        return;
      }

      // Opaque/shallow/deep scalar handling stays in setPrimitiveValueIfSecret for value-pattern fallthrough.
      return this.services.setPrimitiveValueIfSecret(
        container,
        key,
        stringKey,
        container.source[key] as RedactablePrimitive,
        false
      );
    }

    if (shape === 'object') {
      const fieldValue = container.source[key];
      if (!isJsonObject(fieldValue)) {
        return;
      }

      const nestedSchema = this.services.ruleResolver.getMatchingSchema(fieldValue);
      if (nestedSchema) {
        const child = createContainerMutation(fieldValue, container.copyOnWrite);
        return finalizeMaybeAsync(
          this.handleCustomObject(child, nestedSchema),
          () => {
            container.set(key, child.result());
          },
          this.services.asyncMode
        );
      }
    }

    return this.applyContainerStringKeyAction(container, key, stringKey, shape);
  }

  private applyContainerStringKeyAction(
    container: ContainerMutation<JsonObject>,
    key: string,
    stringKey: SecretSpecifierValue,
    shape: 'array' | 'object'
  ): MaybeAsync<void> {
    const fieldValue = container.source[key];
    const action = resolveCustomObjectStringKeyAction(this.services.secretManager, stringKey);

    switch (action.type) {
      case 'remove':
        container.remove(key);
        return;
      case 'opaque':
        return this.services.setPrimitiveFromValue(container, key, fieldValue);
      case 'traverse':
        return shape === 'array'
          ? this.setRedactedArray(container, key, fieldValue as JsonArray, action.forceDeep)
          : this.setRedactedObject(container, key, fieldValue as JsonObject, action.forceDeep);
      case 'none':
        return;
    }
  }

  private applyMatchTypeRule(
    container: ContainerMutation<JsonObject>,
    key: string,
    matchType: CustomObjectMatchType,
    shape: ValueShape
  ): MaybeAsync<void> {
    const fieldValue = container.source[key];

    if (shape === 'primitive') {
      return resolveMaybeAsync(
        applyCustomObjectMatchType(matchType, {
          remove: () => container.remove(key),
          opaque: () => this.services.setPrimitiveFromValue(container, key, fieldValue),
          deep: () => this.services.setPrimitive(container, key, fieldValue as RedactablePrimitive),
          shallow: () => this.services.setPrimitive(container, key, fieldValue as RedactablePrimitive),
          pass: () => undefined
        }),
        this.services.asyncMode
      );
    }

    if (shape === 'array') {
      if (!Array.isArray(fieldValue)) {
        return;
      }

      return resolveMaybeAsync(
        applyCustomObjectMatchType(matchType, {
          remove: () => container.remove(key),
          opaque: () => this.services.setPrimitiveFromValue(container, key, fieldValue),
          deep: () => this.setRedactedArray(container, key, fieldValue, true),
          shallow: () => this.setRedactedArray(container, key, fieldValue, false),
          pass: () => this.services.redactArrayInObject(fieldValue, key, false, container, [])
        }),
        this.services.asyncMode
      );
    }

    if (!isJsonObject(fieldValue)) {
      return;
    }

    const traverseShallow = () => this.setRedactedObject(container, key, fieldValue, false);
    return resolveMaybeAsync(
      applyCustomObjectMatchType(matchType, {
        remove: () => container.remove(key),
        opaque: () => this.services.setPrimitiveFromValue(container, key, fieldValue),
        deep: () => this.setRedactedObject(container, key, fieldValue, true),
        shallow: traverseShallow,
        // Object Pass ≈ shallow traverse (walk nested secrets, keep structure).
        pass: traverseShallow
      }),
      this.services.asyncMode
    );
  }

  private setRedactedArray(
    container: ContainerMutation<JsonObject>,
    key: string,
    fieldValue: JsonArray,
    forceDeepRedaction: boolean
  ): MaybeAsync<void> {
    const redacted = this.services.redactAllArrayValues(fieldValue, forceDeepRedaction, container.copyOnWrite, []);
    if (redacted instanceof Promise) {
      return redacted.then((result) => {
        container.set(key, result);
      });
    }

    container.set(key, redacted);
  }

  private setRedactedObject(
    container: ContainerMutation<JsonObject>,
    key: string,
    fieldValue: JsonObject,
    forceDeepRedaction: boolean
  ): MaybeAsync<void> {
    const child = createContainerMutation(fieldValue, container.copyOnWrite);
    return finalizeMaybeAsync(
      this.services.redactSecretFields(child, forceDeepRedaction, []),
      () => {
        container.set(key, child.result());
      },
      this.services.asyncMode
    );
  }
}
