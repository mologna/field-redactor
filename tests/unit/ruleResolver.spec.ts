import { CustomObjectMatchType } from '../../src/types';
import { RuleResolver } from '../../src/ruleResolver';
import { PathRuleMatcher } from '../../src/pathRuleMatcher';
import { SecretManager } from '../../src/secretManager';
import { ValuePatternMatcher } from '../../src/valuePatternMatcher';
import { CustomObjectManager } from '../../src/customObjectManager';

const createResolver = (options: {
  secretManager?: ConstructorParameters<typeof SecretManager>[0];
  pathRules?: ConstructorParameters<typeof PathRuleMatcher>[0];
  valuePatterns?: RegExp[];
  customObjects?: ConstructorParameters<typeof CustomObjectManager>[0];
}): RuleResolver =>
  new RuleResolver(
    new SecretManager(options.secretManager ?? {}),
    new PathRuleMatcher(options.pathRules ?? []),
    options.valuePatterns?.length ? new ValuePatternMatcher(options.valuePatterns) : new ValuePatternMatcher(),
    new CustomObjectManager(options.customObjects)
  );

describe('RuleResolver', () => {
  it('attributes delete paths by key or path rule', () => {
    const byKey = createResolver({ secretManager: { deleteSecretKeys: [/authKey/] } });
    expect(byKey.attributeDeletePath({ authKey: 'token' }, 'authKey')).toEqual({
      path: 'authKey',
      action: 'delete',
      rule: 'remove',
      pattern: '/authKey/'
    });

    const byPath = createResolver({ pathRules: [{ path: 'session.token', mode: 'remove' }] });
    expect(byPath.attributeDeletePath({ session: { token: 'abc' } }, 'session.token')).toEqual({
      path: 'session.token',
      action: 'delete',
      rule: 'remove',
      pattern: 'session.token'
    });
  });

  it('attributes redact paths in precedence order', () => {
    const schemaResolver = createResolver({
      secretManager: { secretKeys: [/email/] },
      customObjects: [{ name: CustomObjectMatchType.Ignore, type: CustomObjectMatchType.Ignore, value: 'name' }]
    });

    expect(
      schemaResolver.attributeRedactPath(
        { metadata: [{ name: 'email', type: 'String', value: 'alice@example.com' }] },
        'metadata[0].value'
      )
    ).toEqual({
      path: 'metadata[0].value',
      action: 'redact',
      rule: 'schema',
      schemaIndex: 0,
      pattern: '/email/'
    });

    const pathResolver = createResolver({
      pathRules: [{ path: 'logs.*.message', mode: 'deep' }]
    });
    expect(pathResolver.attributeRedactPath({ logs: [{ message: 'secret' }] }, 'logs[0].message')).toEqual({
      path: 'logs[0].message',
      action: 'redact',
      rule: 'deep',
      pattern: 'logs.*.message'
    });

    const enclosingResolver = createResolver({ secretManager: { deepSecretKeys: [/contactInfo/] } });
    expect(
      enclosingResolver.attributeRedactPath({ contactInfo: { email: 'alice@example.com' } }, 'contactInfo.email')
    ).toEqual({
      path: 'contactInfo.email',
      action: 'redact',
      rule: 'deep',
      pattern: '/contactInfo/'
    });

    const valueResolver = createResolver({
      secretManager: { secretKeys: [] },
      valuePatterns: [/\d{3}-\d{2}-\d{4}/]
    });
    expect(valueResolver.attributeRedactPath({ note: '111-22-3333' }, 'note')).toEqual({
      path: 'note',
      action: 'redact',
      rule: 'value',
      pattern: '/\\d{3}-\\d{2}-\\d{4}/'
    });
  });

  it('finds enclosing opaque or deep keys for nested attribution', () => {
    const resolver = createResolver({
      secretManager: { fullSecretKeys: [/rawPayload/], deepSecretKeys: [/contactInfo/] }
    });

    expect(resolver.findEnclosingOpaqueOrDeepKey(['rawPayload', 'token'])).toEqual({
      key: 'rawPayload',
      rule: 'opaque'
    });
    expect(resolver.findEnclosingOpaqueOrDeepKey(['contactInfo', 'email'])).toEqual({
      key: 'contactInfo',
      rule: 'deep'
    });
  });

  it('exposes key-rule helpers for traversal', () => {
    const resolver = createResolver({
      secretManager: {
        deleteSecretKeys: [/removed/],
        fullSecretKeys: [/opaque/],
        deepSecretKeys: [/deep/],
        secretKeys: [/shallow/]
      }
    });

    expect(resolver.shouldRemoveByKey('removed')).toBe(true);
    expect(resolver.shouldOpaqueByKey('opaque')).toBe(true);
    expect(resolver.shouldTraverseContainerByKey('shallow', false)).toBe(true);
    expect(resolver.shouldTraverseContainerByKey('safe', false)).toBe(false);
    expect(resolver.containerForceDeepRedaction('deep', false)).toBe(true);
    expect(resolver.nestedObjectForceDeepRedaction('safe', true)).toBe(true);
  });
});
