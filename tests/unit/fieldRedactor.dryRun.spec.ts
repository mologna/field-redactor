import { CustomObjectMatchType, EMPTY_DRY_RUN_REPORT, FieldRedactor, presets } from '../../src';

describe('FieldRedactor dryRun', () => {
  const redactor = FieldRedactor.createSafe({
    secretKeys: [/email/, /password/],
    deleteSecretKeys: [/authKey/],
    customObjects: [
      {
        name: CustomObjectMatchType.Ignore,
        type: CustomObjectMatchType.Ignore,
        value: 'name'
      }
    ]
  });

  it('dryRunSync returns redacted output and path report without mutating input', () => {
    const input = {
      username: 'alice',
      password: 'secret',
      authKey: 'token',
      contactInfo: { email: 'alice@example.com', city: 'NYC' },
      metadata: [{ name: 'email', type: 'String', value: 'alice@example.com' }]
    };

    const { result, report } = redactor.dryRunSync(input);

    expect(input.password).toBe('secret');
    expect(result.password).toBe('REDACTED');
    expect(result.authKey).toBeUndefined();
    expect(report.deletedPaths).toContain('authKey');
    expect(report.redactedPaths).toEqual(expect.arrayContaining(['password', 'contactInfo.email', 'metadata[0].value']));
    expect(report.matchedSchemas).toEqual([{ path: 'metadata[0]', schemaIndex: 0 }]);
  });

  it('dryRun resolves asynchronously with the same report shape', async () => {
    const input = { password: 'secret' };
    const { result, report } = await redactor.dryRun(input);
    expect(result.password).toBe('REDACTED');
    expect(report.redactedPaths).toEqual(['password']);
  });

  it('returns an empty report for primitive input', () => {
    const { result, report } = redactor.dryRunSync('plain');
    expect(result).toBe('plain');
    expect(report).toEqual(EMPTY_DRY_RUN_REPORT);
  });
});

describe('presets', () => {
  it('applicationLogging matches the real examples fixture configuration', () => {
    const config = presets.applicationLogging();
    expect(config.secretKeys).toEqual([/email/i, /mdn/i, /phone/i, /.+name$/i, /auth/i]);
    expect(config.deleteSecretKeys).toEqual([/authKey/i]);
    expect(config.customObjects?.[0]).toEqual({
      name: CustomObjectMatchType.Ignore,
      value: 'name'
    });
  });

  it('loggingMetadata can be spread into createSafe with additional secretKeys', () => {
    const redactor = FieldRedactor.createSafe({
      ...presets.loggingMetadata(),
      secretKeys: [/ssn/]
    });

    const { result } = redactor.dryRunSync({
      authKey: 'remove-me',
      metadata: { name: 'ssn', type: 'String', value: '123-45-6789' }
    });

    expect(result.authKey).toBeUndefined();
    expect(result.metadata).toEqual({
      name: 'ssn',
      type: 'String',
      value: 'REDACTED'
    });
  });
});
