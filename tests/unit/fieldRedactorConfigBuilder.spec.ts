import { CustomObjectMatchType, FieldRedactorConfigBuilder } from '../../src';

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
    expect(config.fullSecretKeys).toEqual([/rawPayload/i]);
    expect(config.deleteSecretKeys).toEqual([/authKey/i]);
  });

  it('accumulates patterns across repeated calls', () => {
    const config = FieldRedactorConfigBuilder.create().shallow(/email/i, /phone/i).shallow(/password/i).build();
    expect(config.secretKeys).toEqual([/email/i, /phone/i, /password/i]);
  });

  it('supports delete as an alias for remove', () => {
    const config = FieldRedactorConfigBuilder.create().delete(/authKey/i).build();
    expect(config.deleteSecretKeys).toEqual([/authKey/i]);
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
});
