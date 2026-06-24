import { FieldRedactor } from '../../src';

describe('dryRunAttribution', () => {
  it('attributes delete paths without value-pattern matching', () => {
    const redactor = FieldRedactor.createSafe({ deleteSecretKeys: [/authKey/] });
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
});
