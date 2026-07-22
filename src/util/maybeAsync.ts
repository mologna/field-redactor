export type MaybeAsync<T> = T | Promise<T>;

/** Normalizes sync results for async traversal without forcing Promises on the sync path. */
export const resolveMaybeAsync = <T>(value: MaybeAsync<T>, asyncMode: boolean): MaybeAsync<T> => {
  if (!asyncMode) {
    if (value instanceof Promise) {
      throw new Error('Unexpected async work on sync traversal path');
    }

    return value;
  }

  return value instanceof Promise ? value : Promise.resolve(value);
};

export const runSequential = <T>(
  items: readonly T[],
  process: (item: T, index: number) => MaybeAsync<void>,
  asyncMode: boolean
): MaybeAsync<void> => {
  if (!asyncMode) {
    for (let index = 0; index < items.length; index++) {
      const result = process(items[index], index);
      if (result instanceof Promise) {
        throw new Error('Unexpected async work on sync traversal path');
      }
    }
    return;
  }

  return (async () => {
    for (let index = 0; index < items.length; index++) {
      await process(items[index], index);
    }
  })();
};

export const finalizeMaybeAsync = <T>(work: MaybeAsync<void>, result: () => T, asyncMode: boolean): MaybeAsync<T> => {
  if (!asyncMode) {
    if (work instanceof Promise) {
      throw new Error('Unexpected async work on sync traversal path');
    }
    return result();
  }

  if (work instanceof Promise) {
    return work.then(result);
  }

  return result();
};
