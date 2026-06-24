import { CustomObjectMatchType, FieldRedactor, FieldRedactorConfigurationError, validateFieldRedactorConfig } from '../../src';

describe('validateFieldRedactorConfig', () => {
  it('warns when no redaction rules are configured', () => {
    const warnings = validateFieldRedactorConfig({});
    expect(warnings).toContainEqual(expect.stringMatching(/All values will be redacted/));
  });

  it('throws the first warning when strict is true', () => {
    expect(() => validateFieldRedactorConfig({ strict: true })).toThrow(FieldRedactorConfigurationError);
    expect(() => validateFieldRedactorConfig({ strict: true })).toThrow(/All values will be redacted/);
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

  it('still throws for identical schema key sets', () => {
    expect(() =>
      validateFieldRedactorConfig({
        customObjects: [{ foo: CustomObjectMatchType.Ignore, bar: CustomObjectMatchType.Ignore }, { foo: CustomObjectMatchType.Pass, bar: CustomObjectMatchType.Pass }]
      })
    ).toThrow(FieldRedactorConfigurationError);
  });
});

describe('FieldRedactor configuration warnings', () => {
  it('exposes warnings on the instance', () => {
    const redactor = new FieldRedactor({});
    expect(redactor.configWarnings.length).toBeGreaterThan(0);
  });

  it('invokes onConfigWarning for each warning', () => {
    const onConfigWarning = jest.fn();
    new FieldRedactor({ onConfigWarning });
    expect(onConfigWarning).toHaveBeenCalledWith(expect.stringMatching(/All values will be redacted/));
  });
});
