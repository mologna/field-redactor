import { CustomObjectMatchType, FieldRedactor, FieldRedactorConfigBuilder } from '../../src';

describe('dryRunAttribution', () => {
  it('attributes delete paths without value-pattern matching', () => {
    const redactor = FieldRedactor.createSafe({ removeSecretKeys: [/authKey/] });
    const { report } = redactor.dryRunSync({ authKey: 'token', body: 'alice@example.com' });

    expect(report.deletedPaths).toEqual(['authKey']);
    expect(report.pathRules).toEqual([
      { path: 'authKey', action: 'delete', rule: 'remove', pattern: '/authKey/' }
    ]);
  });

  it('attributes path-rule deletes and redactions', () => {
    const redactor = FieldRedactor.createSafe({
      pathRules: [
        { path: 'session.token', mode: 'remove' },
        { path: 'logs.*.message', mode: 'deep' }
      ]
    });

    const { report } = redactor.dryRunSync({
      session: { token: 'abc', id: '1' },
      logs: [{ message: 'secret', meta: { note: 'nested' } }]
    });

    expect(report.pathRules).toEqual(
      expect.arrayContaining([
        { path: 'session.token', action: 'delete', rule: 'remove', pattern: 'session.token' },
        { path: 'logs[0].message', action: 'redact', rule: 'deep', pattern: 'logs.*.message' }
      ])
    );
  });

  it.each([
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
      input: { metadata: [{ name: 'email', type: 'String', value: 'alice@example.com' }] },
      expected: {
        path: 'metadata[0].value',
        action: 'redact',
        rule: 'schema',
        schemaIndex: 0,
        pattern: '/email/'
      }
    },
    {
      name: 'enclosing deep key',
      config: { deepSecretKeys: [/contactInfo/] },
      input: { contactInfo: { email: 'alice@example.com' } },
      expected: {
        path: 'contactInfo.email',
        action: 'redact',
        rule: 'deep',
        pattern: '/contactInfo/'
      }
    },
    {
      name: 'enclosing opaque key',
      config: { opaqueSecretKeys: [/rawPayload/] },
      input: { rawPayload: { token: 'secret' } },
      expected: {
        path: 'rawPayload',
        action: 'redact',
        rule: 'opaque',
        pattern: '/rawPayload/'
      }
    },
    {
      name: 'leaf shallow key',
      config: { secretKeys: [/password/] },
      input: { password: 'secret', note: 'ok' },
      expected: {
        path: 'password',
        action: 'redact',
        rule: 'shallow',
        pattern: '/password/'
      }
    },
    {
      name: 'value pattern',
      config: { secretKeys: [], valuePatterns: [/\d{3}-\d{2}-\d{4}/] },
      input: { note: '111-22-3333', label: 'safe' },
      expected: {
        path: 'note',
        action: 'redact',
        rule: 'value',
        pattern: '/\\d{3}-\\d{2}-\\d{4}/'
      }
    },
    {
      name: 'default shallow redaction',
      config: {},
      input: { username: 'alice' },
      expected: { path: 'username', action: 'redact', rule: 'default' },
      useUnsafeConstructor: true
    }
  ])('attributes $name in pathRules', ({ config, input, expected, useUnsafeConstructor }) => {
    const redactor = useUnsafeConstructor
      ? new FieldRedactor(config)
      : FieldRedactor.createSafe(config);
    const { report } = redactor.dryRunSync(input);

    expect(report.pathRules).toEqual(expect.arrayContaining([expected]));
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

  it('attributes removeSecretKeys the same as legacy deleteSecretKeys', () => {
    const viaPreferred = FieldRedactor.createSafe({ removeSecretKeys: [/authKey/] });
    const viaLegacy = FieldRedactor.createSafe({ deleteSecretKeys: [/authKey/] });
    const input = { authKey: 'token' };

    expect(viaPreferred.dryRunSync(input).report.pathRules).toEqual(
      viaLegacy.dryRunSync(input).report.pathRules
    );
  });
});

describe('naming vocabulary aliases', () => {
  it('treats legacy fullSecretKeys as opaqueSecretKeys', () => {
    const redactor = FieldRedactor.createSafe({ fullSecretKeys: [/payload/] });
    const result = redactor.redactSync({ payload: { token: 'secret' }, note: 'ok' });

    expect(result.payload).toBe('REDACTED');
    expect(result.note).toBe('ok');
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
