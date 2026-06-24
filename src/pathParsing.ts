export type JsonPathSegment = string | number;
export type PathPatternSegment = string | number | '*';

export type ParsePathOptions = {
  allowWildcard?: boolean;
  coerceNumericSegments?: boolean;
};

const pushPatternSegment = (
  segments: PathPatternSegment[],
  segment: string,
  coerceNumericSegments: boolean
): void => {
  if (!segment) {
    return;
  }

  if (coerceNumericSegments && /^\d+$/.test(segment)) {
    segments.push(Number(segment));
    return;
  }

  segments.push(segment);
};

/** Parse dot/bracket path syntax shared by JSON paths and path-rule patterns. */
export const parsePathSegments = (path: string, options: ParsePathOptions = {}): PathPatternSegment[] => {
  if (!path) {
    return [];
  }

  const { allowWildcard = false, coerceNumericSegments = false } = options;
  const segments: PathPatternSegment[] = [];
  let current = '';

  for (let index = 0; index < path.length; index++) {
    const char = path[index];

    if (char === '.') {
      pushPatternSegment(segments, current, coerceNumericSegments);
      current = '';
      continue;
    }

    if (char === '[') {
      pushPatternSegment(segments, current, coerceNumericSegments);
      current = '';
      const close = path.indexOf(']', index);
      segments.push(Number(path.slice(index + 1, close)));
      index = close;
      continue;
    }

    if (allowWildcard && char === '*') {
      pushPatternSegment(segments, current, coerceNumericSegments);
      current = '';
      segments.push('*');
      continue;
    }

    current += char;
  }

  pushPatternSegment(segments, current, coerceNumericSegments);
  return segments;
};

export const parseJsonPath = (path: string): JsonPathSegment[] =>
  parsePathSegments(path, { coerceNumericSegments: false }) as JsonPathSegment[];

export const parsePathRulePattern = (pattern: string): PathPatternSegment[] =>
  parsePathSegments(pattern, { allowWildcard: true, coerceNumericSegments: true });
