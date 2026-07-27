import { CustomObjectMatchType, FieldRedactor, FieldRedactorConfigBuilder } from '../../src';

/**
 * Golden dry-run attribution shapes + legacy naming coverage.
 * Dry-run ↔ RuleResolver lockstep lives in `ruleResolver.contract.spec.ts`.
 */
describe('dryRunAttribution', () => {
  it('attributes remove and path-rule deletes with expected report shapes', () => {
    const redactor = FieldRedactor.createSafe({
      removeSecretKeys: [/authKey/],
      pathRules: [{ path: 'session.token', mode: 'remove' }]
    });

    const { report } = redactor.dryRunSync({
      authKey: 'token',
      session: { token: 'abc', id: '1' },
      body: 'alice@example.com'
    });

    expect(report.deletedPaths).toEqual(expect.arrayContaining(['authKey', 'session.token']));
    expect(report.pathRules).toEqual(
      expect.arrayContaining([
        { path: 'authKey', action: 'delete', rule: 'remove', pattern: '/authKey/' },
        { path: 'session.token', action: 'delete', rule: 'remove', pattern: 'session.token' }
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
});

describe('naming vocabulary aliases', () => {
  it('attributes removeSecretKeys the same as legacy deleteSecretKeys', () => {
    const viaPreferred = FieldRedactor.createSafe({ removeSecretKeys: [/authKey/] });
    const viaLegacy = FieldRedactor.createSafe({ deleteSecretKeys: [/authKey/] });
    const input = { authKey: 'token' };

    expect(viaPreferred.dryRunSync(input).report.pathRules).toEqual(
      viaLegacy.dryRunSync(input).report.pathRules
    );
  });

  it('treats legacy fullSecretKeys as opaqueSecretKeys and warns', () => {
    const redactor = FieldRedactor.createSafe({ fullSecretKeys: [/payload/] });
    const result = redactor.redactSync({ payload: { token: 'secret' }, note: 'ok' });

    expect(result.payload).toBe('REDACTED');
    expect(result.note).toBe('ok');
    expect(redactor.configWarnings.some((w) => w.includes('fullSecretKeys') && w.includes('deprecated'))).toBe(
      true
    );
  });

  it('treats CustomObjectMatchType.Full/Delete as Opaque/Remove', () => {
    expect(CustomObjectMatchType.Opaque).toBe(CustomObjectMatchType.Full);
    expect(CustomObjectMatchType.Remove).toBe(CustomObjectMatchType.Delete);

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
