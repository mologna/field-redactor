import { isJsonObject, JsonArray, JsonObject } from '../types';
import { ContainerMutation, createContainerMutation } from './objectRedactorMutation';
import { finalizeMaybeAsync, MaybeAsync, runSequential } from '../util/maybeAsync';
import { toRedactablePrimitive } from './objectRedactorHelpers';
import { scopeForKey } from '../rules/redactorBinding';
import { TraversalServices } from './traversalServices';

export class ArrayRedactor {
  constructor(private readonly services: TraversalServices) {}

  redactArrayInObject(
    array: JsonArray,
    key: string,
    forceDeepRedaction: boolean,
    parent: ContainerMutation<JsonObject | JsonArray>,
    scope: ReturnType<typeof scopeForKey>
  ): MaybeAsync<void> {
    const redacted = this.services.ruleResolver.shouldTraverseContainerByKey(key, forceDeepRedaction)
      ? this.redactAllArrayValues(
          array,
          this.services.ruleResolver.forceDeepForKey(key, forceDeepRedaction),
          parent.copyOnWrite,
          scope
        )
      : this.redactObjectsInArray(array, parent.copyOnWrite, scope);

    if (redacted instanceof Promise) {
      return redacted.then((result) => {
        parent.set(key, result);
      });
    }

    parent.set(key, redacted);
  }

  redactObjectsInArray(
    array: JsonArray,
    copyOnWrite: boolean,
    scope: ReturnType<typeof scopeForKey>
  ): MaybeAsync<JsonArray> {
    const container = createContainerMutation(array, copyOnWrite, scope.rollback);

    const work = runSequential(
      array,
      (item, index) => {
        if (!isJsonObject(item)) {
          return;
        }

        const customObject = this.services.ruleResolver.getMatchingSchema(item);
        const itemScope = scopeForKey(scope, index);
        const child = createContainerMutation(item, copyOnWrite, itemScope.rollback);
        return finalizeMaybeAsync(
          customObject
            ? this.services.handleCustomObject(child, customObject, itemScope)
            : this.services.redactSecretFields(child, false, itemScope),
          () => {
            container.set(String(index), child.result());
          },
          scope.asyncMode
        );
      },
      scope.asyncMode
    );

    return finalizeMaybeAsync(work, () => container.result(), scope.asyncMode);
  }

  redactAllArrayValues(
    array: JsonArray,
    forceDeepRedaction: boolean,
    copyOnWrite: boolean,
    scope: ReturnType<typeof scopeForKey>
  ): MaybeAsync<JsonArray> {
    const container = createContainerMutation(array, copyOnWrite, scope.rollback);

    const work = runSequential(
      array,
      (item, index) => {
        const key = String(index);
        const itemScope = scopeForKey(scope, index);

        if (Array.isArray(item)) {
          const nested = this.redactAllArrayValues(item, forceDeepRedaction, copyOnWrite, itemScope);
          if (nested instanceof Promise) {
            return nested.then((result) => {
              container.set(key, result);
            });
          }

          container.set(key, nested);
          return;
        }

        if (!isJsonObject(item)) {
          return this.services.setPrimitive(container, key, toRedactablePrimitive(item), itemScope);
        }

        const customObject = this.services.ruleResolver.getMatchingSchema(item);
        const child = createContainerMutation(item, copyOnWrite, itemScope.rollback);
        return finalizeMaybeAsync(
          customObject
            ? this.services.handleCustomObject(child, customObject, itemScope)
            : this.services.redactSecretFields(child, forceDeepRedaction, itemScope),
          () => {
            container.set(key, child.result());
          },
          scope.asyncMode
        );
      },
      scope.asyncMode
    );

    return finalizeMaybeAsync(work, () => container.result(), scope.asyncMode);
  }
}
