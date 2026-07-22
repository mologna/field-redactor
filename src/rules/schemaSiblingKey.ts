import { CustomObject, JsonObject, SecretSpecifierValue } from '../types';

/** Resolve a schema field's sibling string key (e.g. `value: 'name'` → look up `name`). */
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
