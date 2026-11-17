import { JsonArray, JsonObject, JsonRecord, JsonValue } from '../types';
import { InPlaceRollback } from '../util/inPlaceRollback';

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

const rememberWrite = (record: JsonRecord, key: string, rollback: InPlaceRollback | undefined): void => {
  if (!rollback) {
    return;
  }

  const had = Object.prototype.hasOwnProperty.call(record, key);
  const previous = record[key];
  rollback.record(() => {
    if (had) {
      record[key] = previous;
      return;
    }

    delete record[key];
  });
};

export const createContainerMutation = <T extends JsonObject | JsonArray>(
  source: T,
  copyOnWrite: boolean,
  rollback?: InPlaceRollback
): ContainerMutation<T> => {
  if (!copyOnWrite) {
    const record = source as JsonRecord;
    return {
      copyOnWrite: false,
      source,
      set(key, value) {
        const had = Object.prototype.hasOwnProperty.call(record, key);
        if (had && record[key] === value) {
          return;
        }

        rememberWrite(record, key, rollback);
        record[key] = value;
      },
      remove(key) {
        if (!Object.prototype.hasOwnProperty.call(record, key)) {
          return;
        }

        rememberWrite(record, key, rollback);
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
