import { buildFieldRedactorDeps } from '../../src/api/fieldRedactorDeps';
import { RuleResolver } from '../../src/rules/ruleResolver';
import { PathRuleMatcher } from '../../src/rules/pathRuleMatcher';
import { SecretManager } from '../../src/rules/secretManager';

describe('resolveFieldDisposition', () => {
  const secretManager = new SecretManager({ passKeys: [/^public$/] });
  const pathRuleMatcher = new PathRuleMatcher([
    { path: 'user.email', mode: 'shallow' },
    { path: 'user.token', mode: 'opaque' },
    { path: 'user.profile', mode: 'deep' },
    { path: 'user.removed', mode: 'remove' },
    { path: 'user.publicField', mode: 'pass' }
  ]);
  const resolver = new RuleResolver(
    secretManager,
    pathRuleMatcher,
    buildFieldRedactorDeps().valuePatternMatcher,
    buildFieldRedactorDeps().customObjectManager
  );

  it('returns path-rule dispositions before key rules', () => {
    expect(resolver.resolvePathDisposition(['user'], 'email', false)).toEqual({
      action: 'shallow'
    });
    expect(resolver.resolvePathDisposition(['user'], 'token', false)).toEqual({
      action: 'opaque'
    });
    expect(resolver.resolvePathDisposition(['user'], 'profile', false)).toEqual({
      action: 'deep'
    });
    expect(resolver.resolvePathDisposition(['user'], 'removed', false)).toEqual({
      action: 'remove'
    });
    expect(resolver.resolvePathDisposition(['user'], 'publicField', false)).toEqual({
      action: 'skip'
    });
  });

  it('preserves pass keys under forced deep redaction', () => {
    expect(resolver.resolvePathDisposition(['nested'], 'public', true)).toEqual({
      action: 'pass-key-recurse'
    });
    expect(resolver.resolvePathDisposition(['nested'], 'secret', true)).toEqual({
      action: 'default'
    });
  });
});
