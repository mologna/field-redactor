import { FieldRedactor, FieldRedactorConfigBuilder } from '../../src';

describe('pathRules', () => {
  it('counts pathRules as explicit redaction rules for createSafe', () => {
    expect(() => FieldRedactor.createSafe({ pathRules: [{ path: 'note', mode: 'shallow' }] })).not.toThrow();
  });

  it('redacts values at a wildcard path regardless of key name', () => {
    const redactor = FieldRedactor.createSafe({
      secretKeys: [],
      pathRules: [{ path: 'metadata.*.value', mode: 'shallow' }]
    });

    const input = {
      metadata: [
        { name: 'email', value: 'alice@example.com' },
        { name: 'city', value: 'NYC' }
      ],
      note: 'safe'
    };

    const result = redactor.redactSync(input);

    expect(result.metadata?.[0]?.value).not.toBe('alice@example.com');
    expect(result.metadata?.[1]?.value).not.toBe('NYC');
    expect(result.note).toBe('safe');
  });

  it('removes fields matched by path rules', () => {
    const redactor = FieldRedactor.createSafe({
      pathRules: [{ path: 'session.token', mode: 'remove' }]
    });

    const result = redactor.redactSync({ session: { token: 'abc', id: '1' } });

    expect(result.session).toEqual({ id: '1' });
  });

  it('attributes path rules in dryRun reports', () => {
    const redactor = FieldRedactorConfigBuilder.create()
      .pathRule('logs.*.message', 'shallow')
      .buildSafeRedactor();

    const { report } = redactor.dryRunSync({
      logs: [{ message: 'contact alice@example.com' }]
    });

    expect(report.pathRules).toEqual([
      { path: 'logs[0].message', action: 'redact', rule: 'shallow', pattern: 'logs.*.message' }
    ]);
  });

  it('applies deep and opaque path rules', () => {
    const redactor = FieldRedactor.createSafe({
      pathRules: [
        { path: 'payload', mode: 'opaque' },
        { path: 'accountInfo', mode: 'deep' }
      ]
    });

    const result = redactor.redactSync({
      payload: { token: 'secret' },
      accountInfo: { id: '1', ssn: '111-22-3333' }
    });

    expect(result.payload).toBe('REDACTED');
    expect(result.accountInfo?.id).toBe('REDACTED');
    expect(result.accountInfo?.ssn).toBe('REDACTED');
  });

  it('works with async redactors', async () => {
    const redactor = new FieldRedactor({
      pathRules: [{ path: 'note', mode: 'shallow' }],
      redactor: async (value) => `async:${value}`
    });

    const result = await redactor.redact({ note: 'secret', safe: 'ok' });

    expect(result.note).toBe('async:secret');
    expect(result.safe).toBe('ok');
  });

  it('preserves passKeys asynchronously under deep parents', async () => {
    const redactor = new FieldRedactor({
      deepSecretKeys: [/accountInfo/],
      passKeys: [/^profile$/],
      redactor: async (value) => `async:${value}`
    });

    const result = await redactor.redact({
      accountInfo: {
        profile: { displayName: 'Alice' },
        ssn: '111-22-3333'
      }
    });

    expect(result.accountInfo?.profile).toEqual({ displayName: 'Alice' });
    expect(result.accountInfo?.ssn).toBe('async:111-22-3333');
  });

  it('skips pass path rules in async traversal', async () => {
    const redactor = new FieldRedactor({
      deepSecretKeys: [/accountInfo/],
      pathRules: [{ path: 'accountInfo', mode: 'pass' }],
      redactor: async (value) => `async:${value}`
    });

    const result = await redactor.redact({
      accountInfo: { id: 'acct-123', ssn: '111-22-3333' }
    });

    expect(result.accountInfo).toEqual({ id: 'acct-123', ssn: '111-22-3333' });
  });
});

describe('passKeys', () => {
  it('preserves allowlisted keys under deep redaction', () => {
    const redactor = FieldRedactor.createSafe({
      deepSecretKeys: [/accountInfo/],
      passKeys: [/^id$/]
    });

    const input = {
      accountInfo: {
        id: 'acct-123',
        ssn: '111-22-3333'
      }
    };

    const result = redactor.redactSync(input);

    expect(result.accountInfo?.id).toBe('acct-123');
    expect(result.accountInfo?.ssn).not.toBe('111-22-3333');
  });

  it('supports pass path rules for a single field', () => {
    const redactor = FieldRedactor.createSafe({
      deepSecretKeys: [/accountInfo/],
      pathRules: [{ path: 'accountInfo.id', mode: 'pass' }]
    });

    const result = redactor.redactSync({
      accountInfo: { id: 'acct-123', ssn: '111-22-3333' }
    });

    expect(result.accountInfo?.id).toBe('acct-123');
    expect(result.accountInfo?.ssn).not.toBe('111-22-3333');
  });

  it('supports pass path rules for entire subtrees', () => {
    const redactor = FieldRedactor.createSafe({
      deepSecretKeys: [/accountInfo/],
      pathRules: [{ path: 'accountInfo', mode: 'pass' }]
    });

    const result = redactor.redactSync({
      accountInfo: { id: 'acct-123', ssn: '111-22-3333' }
    });

    expect(result.accountInfo).toEqual({ id: 'acct-123', ssn: '111-22-3333' });
  });

  it('preserves allowlisted nested objects under deep redaction', () => {
    const redactor = FieldRedactor.createSafe({
      deepSecretKeys: [/accountInfo/],
      passKeys: [/^profile$/]
    });

    const result = redactor.redactSync({
      accountInfo: {
        profile: { displayName: 'Alice' },
        ssn: '111-22-3333'
      }
    });

    expect(result.accountInfo?.profile).toEqual({ displayName: 'Alice' });
    expect(result.accountInfo?.ssn).not.toBe('111-22-3333');
  });
});
