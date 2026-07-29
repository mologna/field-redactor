import { CustomObjectMatchType, FieldRedactor, FieldRedactorConfigurationError, validateFieldRedactorConfig } from '../../src';

describe('validateFieldRedactorConfig', () => {
  it('does not warn solely because redaction rules are missing', () => {
    expect(validateFieldRedactorConfig({})).toEqual([]);
    expect(validateFieldRedactorConfig()).toEqual([]);
  });

  it('throws the first warning when strict is true', () => {
    expect(() =>
      validateFieldRedactorConfig({
        strict: true,
        secretKeys: [/email/g]
      })
    ).toThrow(FieldRedactorConfigurationError);
    expect(() =>
      validateFieldRedactorConfig({
        strict: true,
        secretKeys: [/email/g]
      })
    ).toThrow(/Global regex/);
  });

  it('warns when the same regex appears in multiple key groups', () => {
    const email = /email/i;
    const warnings = validateFieldRedactorConfig({
      secretKeys: [email],
      deepSecretKeys: [email]
    });

    expect(warnings.some((warning) => warning.includes('secretKeys') && warning.includes('deepSecretKeys'))).toBe(true);
  });

  it('warns when a schema sibling reference is missing from the schema', () => {
    const warnings = validateFieldRedactorConfig({
      customObjects: [{ value: 'name' }]
    });

    expect(warnings.some((warning) => warning.includes("references sibling key `name`"))).toBe(true);
  });

  it('warns when one schema is a subset of another', () => {
    const warnings = validateFieldRedactorConfig({
      customObjects: [{ name: CustomObjectMatchType.Ignore, value: 'name' }, { name: CustomObjectMatchType.Ignore, type: CustomObjectMatchType.Ignore, value: 'name' }]
    });

    expect(warnings.some((warning) => warning.includes('Schemas at index 0 and 1'))).toBe(true);
  });

  it('warns about global regex flags', () => {
    const warnings = validateFieldRedactorConfig({
      secretKeys: [/email/g]
    });

    expect(warnings.some((warning) => warning.includes('Global regex'))).toBe(true);
  });

  it('warns about global flags on valuePatterns without key-rule duplicate tracking', () => {
    const warnings = validateFieldRedactorConfig({
      valuePatterns: [/email/g]
    });

    expect(warnings.some((warning) => warning.includes('Global regex') && warning.includes('valuePatterns'))).toBe(
      true
    );
  });

  it('still throws for identical schema key sets', () => {
    expect(() =>
      validateFieldRedactorConfig({
        customObjects: [
          { foo: CustomObjectMatchType.Ignore, bar: CustomObjectMatchType.Ignore },
          { foo: CustomObjectMatchType.Pass, bar: CustomObjectMatchType.Pass }
        ]
      })
    ).toThrow(FieldRedactorConfigurationError);
  });

  it('throws when fullSecretKeys or deleteSecretKeys are present', () => {
    expect(() =>
      validateFieldRedactorConfig({
        fullSecretKeys: [/payload/]
      } as Parameters<typeof validateFieldRedactorConfig>[0])
    ).toThrow(FieldRedactorConfigurationError);
    expect(() =>
      validateFieldRedactorConfig({
        fullSecretKeys: [/payload/]
      } as Parameters<typeof validateFieldRedactorConfig>[0])
    ).toThrow(/fullSecretKeys.*removed in 2\.0.*opaqueSecretKeys/);

    expect(() =>
      validateFieldRedactorConfig({
        deleteSecretKeys: [/authKey/]
      } as Parameters<typeof validateFieldRedactorConfig>[0])
    ).toThrow(FieldRedactorConfigurationError);
    expect(() =>
      validateFieldRedactorConfig({
        deleteSecretKeys: [/authKey/]
      } as Parameters<typeof validateFieldRedactorConfig>[0])
    ).toThrow(/deleteSecretKeys.*removed in 2\.0.*removeSecretKeys/);
  });
});

describe('FieldRedactor configuration warnings', () => {
  it('exposes warnings on the instance', () => {
    const redactor = new FieldRedactor({ secretKeys: [/email/g] });
    expect(redactor.configWarnings.some((warning) => warning.includes('Global regex'))).toBe(true);
  });

  it('invokes onConfigWarning for each warning', () => {
    const onConfigWarning = jest.fn();
    new FieldRedactor({ secretKeys: [/email/g], onConfigWarning });
    expect(onConfigWarning).toHaveBeenCalledWith(expect.stringMatching(/Global regex/));
  });
});
