import { isJsonObject, JsonObject, JsonValue } from './types';

export const joinPath = (base: string, segment: string | number): string =>
  typeof segment === 'number' ? (base ? `${base}[${segment}]` : `[${segment}]`) : base ? `${base}.${segment}` : segment;

export const isTraversableJson = (value: JsonValue | undefined): value is JsonObject | JsonValue[] =>
  !!value && typeof value === 'object' && !(value instanceof Date);

export const walkTraversableJson = (
  value: JsonValue | undefined,
  path: string,
  visit: (value: JsonValue, path: string) => void
): void => {
  if (!isTraversableJson(value)) {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => walkTraversableJson(item, joinPath(path, index), visit));
    return;
  }

  if (isJsonObject(value)) {
    visit(value, path);
    for (const key of Object.keys(value)) {
      walkTraversableJson(value[key], joinPath(path, key), visit);
    }
  }
};
