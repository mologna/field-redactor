import { CustomObjectMatchType } from './types';

type MaybeAsync<T> = T | Promise<T>;

const run = <T>(handler: () => MaybeAsync<T>): MaybeAsync<T> => handler();

type CustomObjectArrayHandlers = {
  deleteKey(): MaybeAsync<void>;
  redactFull(): MaybeAsync<void>;
  redactDeep(): MaybeAsync<void>;
  redactShallow(): MaybeAsync<void>;
  passThrough(): MaybeAsync<void>;
};

type CustomObjectObjectHandlers = {
  deleteKey(): MaybeAsync<void>;
  redactFull(): MaybeAsync<void>;
  redactDeep(): MaybeAsync<void>;
  redactShallowOrPass(): MaybeAsync<void>;
  ignore(): MaybeAsync<void>;
};

type CustomObjectPrimitiveHandlers = {
  deleteKey(): MaybeAsync<void>;
  redactFull(): MaybeAsync<void>;
  redactScalar(): MaybeAsync<void>;
  passThrough(): MaybeAsync<void>;
};

export const applyCustomObjectArrayMatchType = (
  matchType: CustomObjectMatchType,
  handlers: CustomObjectArrayHandlers
): MaybeAsync<void> => {
  switch (matchType) {
    case CustomObjectMatchType.Delete:
      return run(handlers.deleteKey);
    case CustomObjectMatchType.Full:
      return run(handlers.redactFull);
    case CustomObjectMatchType.Deep:
      return run(handlers.redactDeep);
    case CustomObjectMatchType.Shallow:
      return run(handlers.redactShallow);
    case CustomObjectMatchType.Pass:
      return run(handlers.passThrough);
    default:
      return undefined;
  }
};

export const applyCustomObjectObjectMatchType = (
  matchType: CustomObjectMatchType,
  handlers: CustomObjectObjectHandlers
): MaybeAsync<void> => {
  switch (matchType) {
    case CustomObjectMatchType.Delete:
      return run(handlers.deleteKey);
    case CustomObjectMatchType.Full:
      return run(handlers.redactFull);
    case CustomObjectMatchType.Deep:
      return run(handlers.redactDeep);
    case CustomObjectMatchType.Shallow:
    case CustomObjectMatchType.Pass:
      return run(handlers.redactShallowOrPass);
    case CustomObjectMatchType.Ignore:
      return run(handlers.ignore);
  }
};

export const applyCustomObjectPrimitiveMatchType = (
  matchType: CustomObjectMatchType,
  handlers: CustomObjectPrimitiveHandlers
): MaybeAsync<void> => {
  switch (matchType) {
    case CustomObjectMatchType.Delete:
      return run(handlers.deleteKey);
    case CustomObjectMatchType.Full:
      return run(handlers.redactFull);
    case CustomObjectMatchType.Deep:
    case CustomObjectMatchType.Shallow:
      return run(handlers.redactScalar);
    case CustomObjectMatchType.Pass:
    default:
      return run(handlers.passThrough);
  }
};

export const awaitCustomObjectMatchType = async (result: MaybeAsync<void>): Promise<void> => {
  await result;
};
