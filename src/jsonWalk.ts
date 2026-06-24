import { isJsonObject, JsonArray, JsonObject, JsonValue } from './types';

export const parseJsonPath = (path: string): Array<string | number> => {
  if (!path) {
    return [];
  }

  const segments: Array<string | number> = [];
  let current = '';

  for (let index = 0; index < path.length; index++) {
    const char = path[index];

    if (char === '.') {
      if (current) {
        segments.push(current);
        current = '';
      }
      continue;
    }

    if (char === '[') {
      if (current) {
        segments.push(current);
        current = '';
      }

      const close = path.indexOf(']', index);
      segments.push(Number(path.slice(index + 1, close)));
      index = close;
      continue;
    }

    current += char;
  }

  if (current) {
    segments.push(current);
  }

  return segments;
};

export const getJsonValueAtPath = (value: JsonValue | undefined, segments: Array<string | number>): JsonValue | undefined => {
  let current: JsonValue | undefined = value;

  for (const segment of segments) {
    if (current === undefined || current === null || typeof current !== 'object') {
      return undefined;
    }

    if (Array.isArray(current) && typeof segment === 'number') {
      current = current[segment];
      continue;
    }

    if (isJsonObject(current) && typeof segment === 'string') {
      current = current[segment];
      continue;
    }

    return undefined;
  }

  return current;
};

export const getParentContext = (
  value: JsonValue | undefined,
  segments: Array<string | number>
): { parent: JsonObject | JsonArray | undefined; leaf: string | number | undefined } => {
  if (segments.length === 0) {
    return { parent: undefined, leaf: undefined };
  }

  const leaf = segments.at(-1);
  const parent =
    segments.length === 1 ? value : getJsonValueAtPath(value, segments.slice(0, -1));

  return isTraversableJson(parent) ? { parent, leaf } : { parent: undefined, leaf };
};

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
