import { parsePathRulePattern, PathPatternSegment } from '../util/pathParsing';
import { PathRule, PathRuleMode } from '../types';

type CompiledPathRule = {
  segments: PathPatternSegment[];
  mode: PathRuleMode;
  path: string;
};

const segmentsMatch = (rule: PathPatternSegment[], path: Array<string | number>): boolean => {
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

        const wildcardCount = (segments: PathPatternSegment[]): number =>
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

export { parsePathRulePattern } from '../util/pathParsing';

export const EMPTY_PATH_RULE_MATCHER = new PathRuleMatcher();
