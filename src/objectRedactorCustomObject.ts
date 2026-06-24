import { CustomObjectMatchType } from './types';

type CustomObjectArrayHandlers = {
  deleteKey(): void;
  redactFull(): void;
  redactDeep(): void;
  redactShallow(): void;
  passThrough(): void;
};

type CustomObjectObjectHandlers = {
  deleteKey(): void;
  redactFull(): void;
  redactDeep(): void;
  redactShallowOrPass(): void;
  ignore(): void;
};

type CustomObjectPrimitiveHandlers = {
  deleteKey(): void;
  redactFull(): void;
  redactScalar(): void;
  passThrough(): void;
};

type AsyncCustomObjectArrayHandlers = {
  deleteKey(): Promise<void>;
  redactFull(): Promise<void>;
  redactDeep(): Promise<void>;
  redactShallow(): Promise<void>;
  passThrough(): Promise<void>;
};

type AsyncCustomObjectObjectHandlers = {
  deleteKey(): Promise<void>;
  redactFull(): Promise<void>;
  redactDeep(): Promise<void>;
  redactShallowOrPass(): Promise<void>;
  ignore(): Promise<void>;
};

type AsyncCustomObjectPrimitiveHandlers = {
  deleteKey(): Promise<void>;
  redactFull(): Promise<void>;
  redactScalar(): Promise<void>;
  passThrough(): Promise<void>;
};

export const applyCustomObjectArrayMatchType = (
  matchType: CustomObjectMatchType,
  handlers: CustomObjectArrayHandlers
): void => {
  switch (matchType) {
    case CustomObjectMatchType.Delete:
      handlers.deleteKey();
      return;
    case CustomObjectMatchType.Full:
      handlers.redactFull();
      return;
    case CustomObjectMatchType.Deep:
      handlers.redactDeep();
      return;
    case CustomObjectMatchType.Shallow:
      handlers.redactShallow();
      return;
    case CustomObjectMatchType.Pass:
      handlers.passThrough();
      return;
    default:
      return;
  }
};

export const applyCustomObjectObjectMatchType = (
  matchType: CustomObjectMatchType,
  handlers: CustomObjectObjectHandlers
): void => {
  switch (matchType) {
    case CustomObjectMatchType.Delete:
      handlers.deleteKey();
      return;
    case CustomObjectMatchType.Full:
      handlers.redactFull();
      return;
    case CustomObjectMatchType.Deep:
      handlers.redactDeep();
      return;
    case CustomObjectMatchType.Shallow:
    case CustomObjectMatchType.Pass:
      handlers.redactShallowOrPass();
      return;
    case CustomObjectMatchType.Ignore:
      handlers.ignore();
      return;
  }
};

export const applyCustomObjectPrimitiveMatchType = (
  matchType: CustomObjectMatchType,
  handlers: CustomObjectPrimitiveHandlers
): void => {
  switch (matchType) {
    case CustomObjectMatchType.Delete:
      handlers.deleteKey();
      return;
    case CustomObjectMatchType.Full:
      handlers.redactFull();
      return;
    case CustomObjectMatchType.Deep:
    case CustomObjectMatchType.Shallow:
      handlers.redactScalar();
      return;
    case CustomObjectMatchType.Pass:
    default:
      handlers.passThrough();
      return;
  }
};

export const applyCustomObjectArrayMatchTypeAsync = async (
  matchType: CustomObjectMatchType,
  handlers: AsyncCustomObjectArrayHandlers
): Promise<void> => {
  switch (matchType) {
    case CustomObjectMatchType.Delete:
      await handlers.deleteKey();
      return;
    case CustomObjectMatchType.Full:
      await handlers.redactFull();
      return;
    case CustomObjectMatchType.Deep:
      await handlers.redactDeep();
      return;
    case CustomObjectMatchType.Shallow:
      await handlers.redactShallow();
      return;
    case CustomObjectMatchType.Pass:
      await handlers.passThrough();
      return;
    default:
      return;
  }
};

export const applyCustomObjectObjectMatchTypeAsync = async (
  matchType: CustomObjectMatchType,
  handlers: AsyncCustomObjectObjectHandlers
): Promise<void> => {
  switch (matchType) {
    case CustomObjectMatchType.Delete:
      await handlers.deleteKey();
      return;
    case CustomObjectMatchType.Full:
      await handlers.redactFull();
      return;
    case CustomObjectMatchType.Deep:
      await handlers.redactDeep();
      return;
    case CustomObjectMatchType.Shallow:
    case CustomObjectMatchType.Pass:
      await handlers.redactShallowOrPass();
      return;
    case CustomObjectMatchType.Ignore:
      await handlers.ignore();
      return;
  }
};

export const applyCustomObjectPrimitiveMatchTypeAsync = async (
  matchType: CustomObjectMatchType,
  handlers: AsyncCustomObjectPrimitiveHandlers
): Promise<void> => {
  switch (matchType) {
    case CustomObjectMatchType.Delete:
      await handlers.deleteKey();
      return;
    case CustomObjectMatchType.Full:
      await handlers.redactFull();
      return;
    case CustomObjectMatchType.Deep:
    case CustomObjectMatchType.Shallow:
      await handlers.redactScalar();
      return;
    case CustomObjectMatchType.Pass:
    default:
      await handlers.passThrough();
      return;
  }
};
