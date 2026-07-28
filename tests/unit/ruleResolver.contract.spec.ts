import { buildFieldRedactorDeps } from '../../src/api/fieldRedactorDeps';
import { FieldRedactor } from '../../src/api/fieldRedactor';
import { RuleResolver } from '../../src/rules/ruleResolver';
import { CustomObjectMatchType, DryRunPathRule, FieldRedactorConfig, JsonObject } from '../../src/types';

const createResolver = (config: FieldRedactorConfig): RuleResolver => {
  const deps = buildFieldRedactorDeps(config);
  return new RuleResolver(
    deps.secretManager,
    deps.pathRuleMatcher,
    deps.valuePatternMatcher,
    deps.customObjectManager
  );
};

describe('RuleResolver contract', () => {
  const fixtures: Array<{
    name: string;
    config: FieldRedactorConfig;
    input: JsonObject;
  }> = [
    {
      name: 'shallow and remove keys',
      config: {
        secretKeys: [/password/, /email/],
        removeSecretKeys: [/authKey/]
      },
      input: {
        password: 'secret',
        authKey: 'token',
        contactInfo: { email: 'alice@example.com' }
      }
    },
    {
      name: 'deep and opaque parents',
      config: {
        deepSecretKeys: [/contactInfo/],
        opaqueSecretKeys: [/rawPayload/]
      },
      input: {
        contactInfo: { email: 'alice@example.com' },
        rawPayload: { token: 'secret' }
      }
    },
    {
      name: 'path rules',
      config: {
        secretKeys: [],
        pathRules: [
          { path: 'session.token', mode: 'remove' },
          { path: 'logs.*.message', mode: 'deep' }
        ]
      },
      input: {
        session: { token: 'abc', id: '1' },
        logs: [{ message: 'secret', meta: { note: 'nested' } }]
      }
    },
    {
      name: 'schema sibling key',
      config: {
        secretKeys: [/email/],
        customObjects: [
          {
            name: CustomObjectMatchType.Ignore,
            type: CustomObjectMatchType.Ignore,
            value: 'name'
          }
        ]
      },
      input: {
        metadata: [{ name: 'email', type: 'String', value: 'alice@example.com' }]
      }
    },
    {
      name: 'value patterns',
      config: {
        secretKeys: [],
        valuePatterns: [/\d{3}-\d{2}-\d{4}/]
      },
      input: {
        note: '111-22-3333',
        label: 'safe'
      }
    },
    {
      name: 'pass keys under deep parent',
      config: {
        deepSecretKeys: [/accountInfo/],
        passKeys: [/^profile$/]
      },
      input: {
        accountInfo: {
          profile: { displayName: 'Alice' },
          ssn: '111-22-3333'
        }
      }
    }
  ];

  it.each(fixtures)('dryRun pathRules match RuleResolver attribution for $name', ({ config, input }) => {
    const redactor = FieldRedactor.createSafe(config);
    const resolver = createResolver(config);
    const { report } = redactor.dryRunSync(input);

    for (const path of report.removedPaths) {
      expect(resolver.attributeRemovePath(input, path)).toEqual(
        report.pathRules.find((rule: DryRunPathRule) => rule.path === path)
      );
    }

    for (const path of report.redactedPaths) {
      expect(resolver.attributeRedactPath(input, path)).toEqual(
        report.pathRules.find((rule: DryRunPathRule) => rule.path === path)
      );
    }
  });

  it('path disposition matches traversal behavior for path rules and pass keys', () => {
    const resolver = createResolver({
      passKeys: [/^public$/],
      pathRules: [
        { path: 'user.email', mode: 'shallow' },
        { path: 'user.token', mode: 'opaque' },
        { path: 'user.profile', mode: 'deep' },
        { path: 'user.removed', mode: 'remove' },
        { path: 'user.publicField', mode: 'pass' }
      ]
    });

    expect(resolver.resolvePathDisposition(['user'], 'email', false)).toEqual({ action: 'shallow' });
    expect(resolver.resolvePathDisposition(['user'], 'token', false)).toEqual({ action: 'opaque' });
    expect(resolver.resolvePathDisposition(['user'], 'profile', false)).toEqual({ action: 'deep' });
    expect(resolver.resolvePathDisposition(['user'], 'removed', false)).toEqual({ action: 'remove' });
    expect(resolver.resolvePathDisposition(['user'], 'publicField', false)).toEqual({ action: 'skip' });
    expect(resolver.resolvePathDisposition(['nested'], 'public', true)).toEqual({ action: 'pass-key-recurse' });
    expect(resolver.resolvePathDisposition(['nested'], 'secret', true)).toEqual({ action: 'default' });
  });
});
