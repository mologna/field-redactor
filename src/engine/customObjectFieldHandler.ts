import {
  CustomObject,
  CustomObjectMatchType,
  isJsonObject,
  JsonArray,
  JsonObject,
  RedactablePrimitive,
  SecretSpecifierValue
} from '../types';
import { ContainerMutation, createContainerMutation } from './objectRedactorMutation';
import {
  applyCustomObjectArrayMatchType,
  applyCustomObjectObjectMatchType,
  applyCustomObjectPrimitiveMatchType
} from './objectRedactorCustomObject';
import { getStringSpecifiedCustomObjectSecretKeyValueIfExists } from './objectRedactorHelpers';
import { finalizeMaybeAsync, MaybeAsync, resolveMaybeAsync, runSequential } from '../util/maybeAsync';
import { TraversalServices } from './traversalServices';
import { SecretManager } from '../rules/secretManager';

type StringKeyAction =
  | { type: 'remove' }
  | { type: 'opaque' }
  | { type: 'traverse'; forceDeep: boolean }
  | { type: 'none' };

/** Shared delete/opaque/deep/shallow ladder for schema sibling-key rules. */
export const resolveCustomObjectStringKeyAction = (
  secretManager: SecretManager,
  stringKey: SecretSpecifierValue
): StringKeyAction => {
  if (secretManager.isDeleteSecretKey(stringKey)) {
    return { type: 'remove' };
  }

  if (secretManager.isFullSecretKey(stringKey)) {
    return { type: 'opaque' };
  }

  const forceDeep = secretManager.isDeepSecretKey(stringKey);
  if (forceDeep || secretManager.isSecretKey(stringKey)) {
    return { type: 'traverse', forceDeep };
  }

  return { type: 'none' };
};

export class CustomObjectFieldHandler {
  constructor(private readonly services: TraversalServices) {}

  handleCustomObject(container: ContainerMutation<JsonObject>, customObject: CustomObject): MaybeAsync<void> {
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
      this.services.asyncMode
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

    const action = resolveCustomObjectStringKeyAction(this.services.secretManager, stringKey);
    switch (action.type) {
      case 'remove':
        container.remove(key);
        return;
      case 'opaque':
        return this.services.setPrimitiveFromValue(container, key, fieldValue);
      case 'traverse':
        return this.setRedactedArray(container, key, fieldValue, action.forceDeep);
      case 'none':
        return;
    }
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
        redactFull: () => this.services.setPrimitiveFromValue(container, key, fieldValue),
        redactDeep: () => this.setRedactedArray(container, key, fieldValue, true),
        redactShallow: () => this.setRedactedArray(container, key, fieldValue, false),
        passThrough: () => this.services.redactArrayInObject(fieldValue, key, false, container, [])
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

    const action = resolveCustomObjectStringKeyAction(this.services.secretManager, stringKey);
    switch (action.type) {
      case 'remove':
        container.remove(key);
        return;
      case 'opaque':
        return this.services.setPrimitiveFromValue(container, key, fieldValue);
      case 'traverse':
        return this.setRedactedObject(container, key, fieldValue, action.forceDeep);
      case 'none':
        return;
    }
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
        redactFull: () => this.services.setPrimitiveFromValue(container, key, fieldValue),
        redactDeep: () => this.setRedactedObject(container, key, fieldValue, true),
        redactShallowOrPass: () => this.setRedactedObject(container, key, fieldValue, false),
        ignore: () => undefined
      }),
      this.services.asyncMode
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
      this.services.redactSecretFields(child, forceDeepRedaction, []),
      () => {
        container.set(key, child.result());
      },
      this.services.asyncMode
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
        redactFull: () => this.services.setPrimitiveFromValue(container, key, container.source[key]),
        redactScalar: () => this.services.setPrimitive(container, key, container.source[key] as RedactablePrimitive),
        passThrough: () => undefined
      }),
      this.services.asyncMode
    );
  }

  private handleCustomObjectPrimitiveValueIfStringKeySpecified(
    container: ContainerMutation<JsonObject>,
    secretKey: SecretSpecifierValue,
    key: string
  ): MaybeAsync<void> {
    const action = resolveCustomObjectStringKeyAction(this.services.secretManager, secretKey);
    if (action.type === 'remove') {
      container.remove(key);
      return;
    }

    // Opaque/shallow/deep scalar handling stays in setPrimitiveValueIfSecret for value-pattern fallthrough.
    return this.services.setPrimitiveValueIfSecret(
      container,
      key,
      secretKey,
      container.source[key] as RedactablePrimitive,
      false
    );
  }
}
