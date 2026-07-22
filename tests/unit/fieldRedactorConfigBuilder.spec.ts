import { CustomObjectMatchType, FieldRedactorConfigBuilder, presets } from '../../src';

describe('FieldRedactorConfigBuilder', () => {
  it('maps fluent methods to FieldRedactorConfig fields', () => {
    const config = FieldRedactorConfigBuilder.create()
      .shallow(/email/i)
      .deep(/accountInfo/i)
      .opaque(/rawPayload/i)
      .remove(/authKey/i)
      .build();

    expect(config.secretKeys).toEqual([/email/i]);
    expect(config.deepSecretKeys).toEqual([/accountInfo/i]);
    expect(config.opaqueSecretKeys).toEqual([/rawPayload/i]);
    expect(config.removeSecretKeys).toEqual([/authKey/i]);
  });

  it('accumulates patterns across repeated calls', () => {
    const config = FieldRedactorConfigBuilder.create().shallow(/email/i, /phone/i).shallow(/password/i).build();
    expect(config.secretKeys).toEqual([/email/i, /phone/i, /password/i]);
  });

  it('maps valuePattern to valuePatterns and accumulates entries', () => {
    const config = FieldRedactorConfigBuilder.create()
      .valuePattern(/email/i)
      .valuePattern(/phone/i)
      .build();

    expect(config.valuePatterns).toEqual([/email/i, /phone/i]);
  });

  it('supports delete as an alias for remove', () => {
    const config = FieldRedactorConfigBuilder.create().delete(/authKey/i).build();
    expect(config.removeSecretKeys).toEqual([/authKey/i]);
  });

  it('registers schemas with optional names for dry-run reports', () => {
    const redactor = FieldRedactorConfigBuilder.create()
      .shallow(/email/)
      .schema(
        { name: CustomObjectMatchType.Ignore, type: CustomObjectMatchType.Ignore, value: 'name' },
        { name: 'metadata-entry' }
      )
      .buildSafeRedactor();

    const { report } = redactor.dryRunSync({
      metadata: [{ name: 'email', type: 'String', value: 'alice@example.com' }]
    });

    expect(report.matchedSchemas).toEqual([
      { path: 'metadata[0]', schemaIndex: 0, schemaName: 'metadata-entry' }
    ]);
  });

  it('buildSafeRedactor requires explicit rules', () => {
    expect(() => FieldRedactorConfigBuilder.create().buildSafeRedactor()).toThrow();
  });

  it('usePreset merges preset config and allows extending with fluent methods', () => {
    const redactor = FieldRedactorConfigBuilder.create()
      .usePreset(presets.applicationLogging())
      .shallow(/ssn/i)
      .buildSafeRedactor();

    const { result, report } = redactor.dryRunSync({
      email: 'alice@example.com',
      authKey: 'secret',
      ssn: '123-45-6789',
      metadata: [{ name: 'email', value: 'alice@example.com' }]
    });

    expect(result.authKey).toBeUndefined();
    expect(result.ssn).toBe('REDACTED');
    expect(report.pathRules).toEqual(
      expect.arrayContaining([
        { path: 'authKey', action: 'delete', rule: 'remove', pattern: '/authKey/i' },
        { path: 'email', action: 'redact', rule: 'shallow', pattern: '/email/i' },
        { path: 'ssn', action: 'redact', rule: 'shallow', pattern: '/ssn/i' }
      ])
    );
  });

  it('builds path rules and passKeys', () => {
    const config = FieldRedactorConfigBuilder.create()
      .pathRule('metadata.*.value', 'shallow')
      .passKey(/^id$/)
      .build();

    expect(config.pathRules).toEqual([{ path: 'metadata.*.value', mode: 'shallow' }]);
    expect(config.passKeys).toEqual([/^id$/]);
  });

  it('supports scalar builder options', () => {
    const warnings: string[] = [];
    const config = FieldRedactorConfigBuilder.create()
      .shallow(/email/i)
      .redactor(async (value) => `async:${value}`)
      .syncRedactor((value) => `sync:${value}`)
      .ignoreBooleans(true)
      .ignoreNullOrUndefined(false)
      .cloneInput(false)
      .strict()
      .onConfigWarning((message) => warnings.push(message))
      .build();

    expect(config.syncRedactor?.('x')).toBe('sync:x');
    expect(config.ignoreBooleans).toBe(true);
    expect(config.ignoreNullOrUndefined).toBe(false);
    expect(config.cloneInput).toBe(false);
    expect(config.strict).toBe(true);
    expect(config.onConfigWarning).toBeDefined();
  });
});
