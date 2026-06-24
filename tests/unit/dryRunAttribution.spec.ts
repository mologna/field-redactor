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
});
