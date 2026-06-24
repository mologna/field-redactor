import { ValuePatternMatcher } from '../../src/valuePatternMatcher';

describe('ValuePatternMatcher', () => {
  it('reports whether patterns are configured', () => {
    expect(new ValuePatternMatcher().hasPatterns()).toBe(false);
    expect(new ValuePatternMatcher([/email/]).hasPatterns()).toBe(true);
  });

  it('matches string and numeric primitives', () => {
    const matcher = new ValuePatternMatcher([/^secret$/]);
    expect(matcher.findMatching('secret')).toBeDefined();
    expect(matcher.findMatching('public')).toBeUndefined();
    expect(matcher.findMatching(123)).toBeUndefined();
    expect(matcher.findMatching(undefined)).toBeUndefined();
    expect(matcher.findMatching(true)).toBeUndefined();
  });

  it('formats patterns for dry-run reports', () => {
    const pattern = /example\.com/;
    const matcher = new ValuePatternMatcher([pattern]);
    const match = matcher.findMatching('alice@example.com');
    expect(match).toBe(pattern);
    expect(matcher.formatPattern(match!)).toBe('/example\\.com/');
  });
});
