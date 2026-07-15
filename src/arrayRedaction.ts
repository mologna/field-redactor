import { isJsonObject, JsonArray, JsonObject } from './types';
import { ContainerMutation, createContainerMutation } from './objectRedactorMutation';
import { finalizeMaybeAsync, MaybeAsync, runSequential } from './maybeAsync';
import { toRedactablePrimitive } from './objectRedactorHelpers';
import { TraversalServices } from './traversalServices';

export class ArrayRedactor {
  constructor(private readonly services: TraversalServices) {}

  redactArrayInObject(
    array: JsonArray,
    key: string,
    forceDeepRedaction: boolean,
    parent: ContainerMutation<JsonObject | JsonArray>,
    pathSegments: Array<string | number>
  ): MaybeAsync<void> {
    const redacted = this.services.ruleResolver.shouldTraverseContainerByKey(key, forceDeepRedaction)
      ? this.redactAllArrayValues(
          array,
          this.services.ruleResolver.containerForceDeepRedaction(key, forceDeepRedaction),
          parent.copyOnWrite,
          pathSegments
        )
      : this.redactObjectsInArray(array, parent.copyOnWrite, pathSegments);

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
    pathSegments: Array<string | number>
  ): MaybeAsync<JsonArray> {
    const container = createContainerMutation(array, copyOnWrite);

    const work = runSequential(
      array,
      (item, index) => {
        if (!isJsonObject(item)) {
          return;
        }

        const customObject = this.services.ruleResolver.getMatchingSchema(item);
        const child = createContainerMutation(item, copyOnWrite);
        const itemPath = [...pathSegments, index];
        return finalizeMaybeAsync(
          customObject
            ? this.services.handleCustomObject(child, customObject)
            : this.services.redactSecretFields(child, false, itemPath),
          () => {
            container.set(String(index), child.result());
          },
          this.services.asyncMode
        );
      },
      this.services.asyncMode
    );

    return finalizeMaybeAsync(work, () => container.result(), this.services.asyncMode);
  }

  redactAllArrayValues(
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
          return this.services.setPrimitive(container, key, toRedactablePrimitive(item));
        }

        const customObject = this.services.ruleResolver.getMatchingSchema(item);
        const child = createContainerMutation(item, copyOnWrite);
        return finalizeMaybeAsync(
          customObject
            ? this.services.handleCustomObject(child, customObject)
            : this.services.redactSecretFields(child, forceDeepRedaction, itemPath),
          () => {
            container.set(key, child.result());
          },
          this.services.asyncMode
        );
      },
      this.services.asyncMode
    );

    return finalizeMaybeAsync(work, () => container.result(), this.services.asyncMode);
  }
}
