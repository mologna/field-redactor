import { JsonArray, JsonObject, JsonRecord, JsonValue } from './types';

type ObjectCopyState<T extends JsonObject> = {
  source: T;
  current: T;
  copied: boolean;
};

type ArrayCopyState<T extends JsonArray> = {
  source: T;
  current: T;
  copied: boolean;
};

export type ContainerMutation<T extends JsonObject | JsonArray> = {
  readonly copyOnWrite: boolean;
  readonly source: T;
  set(key: string, value: JsonValue | undefined): void;
  remove(key: string): void;
  result(): T;
};

const createObjectCopyState = <T extends JsonObject>(source: T): ObjectCopyState<T> => ({
  source,
  current: source,
  copied: false
});

const createArrayCopyState = <T extends JsonArray>(source: T): ArrayCopyState<T> => ({
  source,
  current: source,
  copied: false
});

const finishObjectCopy = <T extends JsonObject>(state: ObjectCopyState<T>): T =>
  state.copied ? state.current : state.source;

const finishArrayCopy = <T extends JsonArray>(state: ArrayCopyState<T>): T =>
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

export const createContainerMutation = <T extends JsonObject | JsonArray>(
  source: T,
  copyOnWrite: boolean
): ContainerMutation<T> => {
  if (!copyOnWrite) {
    const record = source as JsonRecord;
    return {
      copyOnWrite: false,
      source,
      set(key, value) {
        record[key] = value;
      },
      remove(key) {
        delete record[key];
      },
      result() {
        return source;
      }
    };
  }

  if (Array.isArray(source)) {
    const state = createArrayCopyState(source);
    return {
      copyOnWrite: true,
      source,
      set(key, value) {
        const index = Number(key);
        if (source[index] !== value) {
          ensureArrayCopy(state)[index] = value;
        }
      },
      remove(key) {
        const index = Number(key);
        if (index < source.length) {
          delete ensureArrayCopy(state)[index];
        }
      },
      result() {
        return finishArrayCopy(state) as T;
      }
    };
  }

  const state = createObjectCopyState(source);
  return {
    copyOnWrite: true,
    source,
    set(key, value) {
      if (source[key] !== value) {
        ensureObjectCopy(state)[key] = value;
      }
    },
    remove(key) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        delete ensureObjectCopy(state)[key];
      }
    },
    result() {
      return finishObjectCopy(state) as T;
    }
  };
};
