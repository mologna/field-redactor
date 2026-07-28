import { CustomObjectMatchType, FieldRedactor, FieldRedactorConfigBuilder } from '../../src';

/**
 * Golden dry-run attribution shapes.
 * Dry-run ↔ RuleResolver lockstep lives in `ruleResolver.contract.spec.ts`.
 */
describe('dryRunAttribution', () => {
  it('attributes remove and path-rule removes with expected report shapes', () => {
    const redactor = FieldRedactor.createSafe({
      removeSecretKeys: [/authKey/],
      pathRules: [{ path: 'session.token', mode: 'remove' }]
    });

    const { report } = redactor.dryRunSync({
      authKey: 'token',
      session: { token: 'abc', id: '1' },
      body: 'alice@example.com'
    });

    expect(report.removedPaths).toEqual(expect.arrayContaining(['authKey', 'session.token']));
    expect(report.pathRules).toEqual(
      expect.arrayContaining([
        { path: 'authKey', action: 'remove', rule: 'remove', pattern: '/authKey/' },
        { path: 'session.token', action: 'remove', rule: 'remove', pattern: 'session.token' }
      ])
    );
  });

  it('prefers schema attribution over leaf key rules for matching fields', () => {
    const redactor = FieldRedactor.createSafe({
      secretKeys: [/email/, /password/],
      customObjects: [
        {
          name: CustomObjectMatchType.Ignore,
          type: CustomObjectMatchType.Ignore,
          value: 'name'
        }
      ]
    });

    const { report } = redactor.dryRunSync({
      password: 'secret',
      metadata: [{ name: 'email', type: 'String', value: 'alice@example.com' }]
    });

    expect(report.pathRules).toEqual(
      expect.arrayContaining([
        { path: 'password', action: 'redact', rule: 'shallow', pattern: '/password/' },
        {
          path: 'metadata[0].value',
          action: 'redact',
          rule: 'schema',
          schemaIndex: 0,
          pattern: '/email/'
        }
      ])
    );
  });

  it('applies Opaque and Remove custom object match types', () => {
    const redactor = FieldRedactorConfigBuilder.create()
      .schema({
        secret: CustomObjectMatchType.Opaque,
        gone: CustomObjectMatchType.Remove
      })
      .buildSafeRedactor();

    const result = redactor.redactSync({
      secret: { nested: 'x' },
      gone: 'delete-me',
      other: 'keep'
    });

    expect(result.secret).toBe('REDACTED');
    expect(result.gone).toBeUndefined();
    expect(result.other).toBe('keep');
  });
});
