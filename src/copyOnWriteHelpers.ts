import { JsonArray, JsonObject, JsonRecord, JsonValue } from './types';

export type ObjectCopyState<T extends JsonObject> = {
  source: T;
  current: T;
  copied: boolean;
};

export type ArrayCopyState<T extends JsonArray> = {
  source: T;
  current: T;
  copied: boolean;
};

export const createObjectCopyState = <T extends JsonObject>(source: T): ObjectCopyState<T> => ({
  source,
  current: source,
  copied: false
});

export const createArrayCopyState = <T extends JsonArray>(source: T): ArrayCopyState<T> => ({
  source,
  current: source,
  copied: false
});

export const finishObjectCopy = <T extends JsonObject>(state: ObjectCopyState<T>): T =>
  state.copied ? state.current : state.source;

export const finishArrayCopy = <T extends JsonArray>(state: ArrayCopyState<T>): T =>
  state.copied ? state.current : state.source;

const ensureObjectCopy = <T extends JsonObject>(state: ObjectCopyState<T>): JsonRecord => {
  if (!state.copied) {
    state.current = { ...state.source };
    state.copied = true;
  }

  return state.current;
};

const ensureArrayCopy = <T extends JsonArray>(state: ArrayCopyState<T>): JsonArray => {
  if (!state.copied) {
    state.current = state.source.slice() as T;
    state.copied = true;
  }

  return state.current;
};

export const setObjectKey = <T extends JsonObject>(
  state: ObjectCopyState<T>,
  key: string,
  value: JsonValue | undefined
): void => {
  if (state.source[key] !== value) {
    ensureObjectCopy(state)[key] = value;
  }
};

export const deleteObjectKey = <T extends JsonObject>(state: ObjectCopyState<T>, key: string): void => {
  if (Object.prototype.hasOwnProperty.call(state.source, key)) {
    delete ensureObjectCopy(state)[key];
  }
};

export const setArrayIndex = <T extends JsonArray>(
  state: ArrayCopyState<T>,
  index: number,
  value: JsonValue | undefined
): void => {
  if (state.source[index] !== value) {
    ensureArrayCopy(state)[index] = value;
  }
};

export const deleteArrayIndex = <T extends JsonArray>(state: ArrayCopyState<T>, index: number): void => {
  if (index < state.source.length) {
    delete ensureArrayCopy(state)[index];
  }
};
