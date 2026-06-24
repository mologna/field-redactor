import { parsePathRulePattern, PathRuleMatcher } from '../../src/pathRuleMatcher';

describe('parsePathRulePattern', () => {
  it('parses dotted paths and array indices', () => {
    expect(parsePathRulePattern('metadata.*.value')).toEqual(['metadata', '*', 'value']);
    expect(parsePathRulePattern('items[0].name')).toEqual(['items', 0, 'name']);
    expect(parsePathRulePattern('metadata.0.value')).toEqual(['metadata', 0, 'value']);
  });

  it('returns an empty array for blank patterns', () => {
    expect(parsePathRulePattern('')).toEqual([]);
  });
});

describe('PathRuleMatcher', () => {
  it('matches wildcard segments and prefers the longest rule', () => {
    const matcher = new PathRuleMatcher([
      { path: 'metadata.*.value', mode: 'shallow' },
      { path: 'metadata.0.value', mode: 'opaque' }
    ]);

    expect(matcher.getMatchingRule(['metadata', 0, 'value'])?.mode).toBe('opaque');
    expect(matcher.getMatchingRule(['metadata', 1, 'value'])?.mode).toBe('shallow');
    expect(matcher.getMatchingRule(['metadata', 1, 'name'])).toBeUndefined();
  });

  it('reports whether rules are configured', () => {
    expect(new PathRuleMatcher().hasRules()).toBe(false);
    expect(new PathRuleMatcher([{ path: 'id', mode: 'pass' }]).hasRules()).toBe(true);
  });
});
