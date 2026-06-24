import { PathRule, PathRuleMode } from './types';

export type PathSegment = string | number | '*';

export type CompiledPathRule = {
  segments: PathSegment[];
  mode: PathRuleMode;
  path: string;
};

/** Parse a path-rule pattern (`metadata.*.value`, `items[0].name`) into segments. */
export const parsePathRulePattern = (pattern: string): PathSegment[] => {
  const segments: PathSegment[] = [];
  let current = '';

  const pushSegment = (segment: string): void => {
    if (!segment) {
      return;
    }

    if (segment === '*') {
      segments.push('*');
      return;
    }

    if (/^\d+$/.test(segment)) {
      segments.push(Number(segment));
      return;
    }

    segments.push(segment);
  };

  for (let index = 0; index < pattern.length; index++) {
    const char = pattern[index];

    if (char === '.') {
      pushSegment(current);
      current = '';
      continue;
    }

    if (char === '[') {
      pushSegment(current);
      current = '';
      const close = pattern.indexOf(']', index);
      segments.push(Number(pattern.slice(index + 1, close)));
      index = close;
      continue;
    }

    current += char;
  }

  pushSegment(current);
  return segments;
};

const segmentsMatch = (rule: PathSegment[], path: Array<string | number>): boolean => {
  if (rule.length !== path.length) {
    return false;
  }

  return rule.every((segment, index) => segment === '*' || segment === path[index]);
};

/**
 * Matches configured path rules against traversal paths. Longest matching rule wins.
 */
export class PathRuleMatcher {
  private readonly rules: CompiledPathRule[];

  constructor(pathRules?: PathRule[]) {
    this.rules = (pathRules ?? [])
      .map((rule) => ({
        segments: parsePathRulePattern(rule.path),
        mode: rule.mode,
        path: rule.path
      }))
      .filter((rule) => rule.segments.length > 0)
      .sort((left, right) => {
        if (right.segments.length !== left.segments.length) {
          return right.segments.length - left.segments.length;
        }

        const wildcardCount = (segments: PathSegment[]): number =>
          segments.filter((segment) => segment === '*').length;

        return wildcardCount(left.segments) - wildcardCount(right.segments);
      });
  }

  getMatchingRule(path: Array<string | number>): CompiledPathRule | undefined {
    return this.rules.find((rule) => segmentsMatch(rule.segments, path));
  }

  hasRules(): boolean {
    return this.rules.length > 0;
  }
}

export const EMPTY_PATH_RULE_MATCHER = new PathRuleMatcher();
