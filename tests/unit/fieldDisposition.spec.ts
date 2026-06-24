import { resolveFieldDisposition } from '../../src/fieldDisposition';
import { PathRuleMatcher } from '../../src/pathRuleMatcher';
import { SecretManager } from '../../src/secretManager';

describe('resolveFieldDisposition', () => {
  const secretManager = new SecretManager({ passKeys: [/^public$/] });
  const pathRuleMatcher = new PathRuleMatcher([
    { path: 'user.email', mode: 'shallow' },
    { path: 'user.token', mode: 'opaque' },
    { path: 'user.profile', mode: 'deep' },
    { path: 'user.removed', mode: 'remove' },
    { path: 'user.publicField', mode: 'pass' }
  ]);

  it('returns path-rule dispositions before key rules', () => {
    expect(resolveFieldDisposition(secretManager, pathRuleMatcher, 'email', ['user'], false)).toEqual({
      action: 'shallow'
    });
    expect(resolveFieldDisposition(secretManager, pathRuleMatcher, 'token', ['user'], false)).toEqual({
      action: 'opaque'
    });
    expect(resolveFieldDisposition(secretManager, pathRuleMatcher, 'profile', ['user'], false)).toEqual({
      action: 'deep'
    });
    expect(resolveFieldDisposition(secretManager, pathRuleMatcher, 'removed', ['user'], false)).toEqual({
      action: 'remove'
    });
    expect(resolveFieldDisposition(secretManager, pathRuleMatcher, 'publicField', ['user'], false)).toEqual({
      action: 'skip'
    });
  });

  it('preserves pass keys under forced deep redaction', () => {
    expect(resolveFieldDisposition(secretManager, pathRuleMatcher, 'public', ['nested'], true)).toEqual({
      action: 'pass-key-recurse'
    });
    expect(resolveFieldDisposition(secretManager, pathRuleMatcher, 'secret', ['nested'], true)).toEqual({
      action: 'default'
    });
  });
});
