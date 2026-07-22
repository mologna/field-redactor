import { JsonLeafValue, JsonValue, RedactablePrimitive, SecretSpecifierValue } from '../types';
import { SecretManager } from '../rules/secretManager';
import { ValuePatternMatcher } from '../rules/valuePatternMatcher';
import { getStringValue, toRedactablePrimitive } from '../util/primitiveCoercion';

export type RedactPrimitiveFn<T> = (value: RedactablePrimitive) => T;

export { getStringValue, toRedactablePrimitive } from '../util/primitiveCoercion';
export { getStringSpecifiedCustomObjectSecretKeyValueIfExists } from '../rules/schemaSiblingKey';

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
      secretManager.isOpaqueSecretKey(key) ||
      forceDeepRedaction ||
      secretManager.isSecretKey(key) ||
      secretManager.isDeepSecretKey(key)
    ) {
      return redact(getStringValue(value));
    }

    return value;
  }

  if (secretManager.isOpaqueSecretKey(key)) {
    return redact(getStringValue(value));
  }

  if (forceDeepRedaction || secretManager.isSecretKey(key) || secretManager.isDeepSecretKey(key)) {
    if (secretManager.isPassKey(key)) {
      return value;
    }

    return redact(value as RedactablePrimitive);
  }

  if (valuePatternMatcher.findMatching(toRedactablePrimitive(value))) {
    return redact(value as RedactablePrimitive);
  }

  return value;
}
