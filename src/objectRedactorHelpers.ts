import {
  CustomObject,
  isJsonObject,
  JsonLeafValue,
  JsonObject,
  JsonValue,
  RedactablePrimitive,
  SecretSpecifierValue
} from './types';
import { SecretManager } from './secretManager';
import { ValuePatternMatcher } from './valuePatternMatcher';

export type RedactPrimitiveFn<T> = (value: RedactablePrimitive) => T;

export function toRedactablePrimitive(value: JsonLeafValue | undefined): RedactablePrimitive {
  if (value instanceof Date || typeof value === 'function') {
    return getStringValue(value);
  }

  return value;
}

export function getStringValue(val: JsonValue | undefined): RedactablePrimitive {
  if (isJsonObject(val) || Array.isArray(val)) {
    return JSON.stringify(val);
  }

  if (val instanceof Date || typeof val === 'function') {
    return val.toString();
  }

  return val;
}

export function getStringSpecifiedCustomObjectSecretKeyValueIfExists(
  value: JsonObject,
  customObject: CustomObject,
  key: string
): SecretSpecifierValue | undefined {
  const siblingKeyName = customObject[key];
  if (typeof siblingKeyName !== 'string') {
    return undefined;
  }

  if (!Object.prototype.hasOwnProperty.call(value, siblingKeyName)) {
    return undefined;
  }

  const siblingValue = value[siblingKeyName];
  if (typeof siblingValue === 'string' || typeof siblingValue === 'number' || typeof siblingValue === 'boolean') {
    return siblingValue;
  }

  return undefined;
}

export function redactPrimitiveValueIfSecret<T>(
  secretManager: SecretManager,
  valuePatternMatcher: ValuePatternMatcher,
  redact: RedactPrimitiveFn<T>,
  key: SecretSpecifierValue,
  value: JsonLeafValue | undefined,
  forceDeepRedaction: boolean
): JsonValue | undefined | T {
  if (value instanceof Date || typeof value === 'function') {
    if (
      secretManager.isFullSecretKey(key) ||
      forceDeepRedaction ||
      secretManager.isSecretKey(key) ||
      secretManager.isDeepSecretKey(key)
    ) {
      return redact(getStringValue(value));
    }

    return value;
  }

  if (secretManager.isFullSecretKey(key)) {
    return redact(getStringValue(value));
  }

  if (forceDeepRedaction || secretManager.isSecretKey(key) || secretManager.isDeepSecretKey(key)) {
    return redact(value as RedactablePrimitive);
  }

  if (valuePatternMatcher.findMatching(toRedactablePrimitive(value))) {
    return redact(value as RedactablePrimitive);
  }

  return value;
}
