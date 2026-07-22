import {
  isJsonObject,
  JsonLeafValue,
  JsonValue,
  RedactablePrimitive
} from '../types';

export function getStringValue(val: JsonValue | undefined): RedactablePrimitive {
  if (isJsonObject(val) || Array.isArray(val)) {
    return JSON.stringify(val);
  }

  if (val instanceof Date || typeof val === 'function') {
    return val.toString();
  }

  return val;
}

export function toRedactablePrimitive(value: JsonLeafValue | undefined): RedactablePrimitive {
  if (value instanceof Date || typeof value === 'function') {
    return getStringValue(value);
  }

  return value;
}
