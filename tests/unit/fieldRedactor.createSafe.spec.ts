import { CustomObjectMatchType, FieldRedactor, FieldRedactorConfigurationError } from '../../src';

describe('FieldRedactor.createSafe', () => {
  it('creates a redactor when secretKeys are provided', () => {
    const redactor = FieldRedactor.createSafe({ secretKeys: [/email/] });
    expect(redactor).toBeInstanceOf(FieldRedactor);
  });

  it('accepts each secret specifier type as an explicit rule', () => {
    expect(() => FieldRedactor.createSafe({ deepSecretKeys: [/account/] })).not.toThrow();
    expect(() => FieldRedactor.createSafe({ opaqueSecretKeys: [/payload/] })).not.toThrow();
    expect(() => FieldRedactor.createSafe({ removeSecretKeys: [/authKey/] })).not.toThrow();
  });

  it('accepts customObjects as explicit rules', () => {
    expect(() =>
      FieldRedactor.createSafe({
        customObjects: [{ name: CustomObjectMatchType.Ignore, value: 'name' }]
      })
    ).not.toThrow();
  });

  it('accepts valuePatterns as explicit rules', () => {
    expect(() => FieldRedactor.createSafe({ valuePatterns: [/email/] })).not.toThrow();
  });

  it('throws FieldRedactorConfigurationError when no rules are provided', () => {
    expect(() => FieldRedactor.createSafe({})).toThrow(FieldRedactorConfigurationError);
    expect(() => FieldRedactor.createSafe({})).toThrow(/requires at least one non-empty/);
  });

  it('throws when only empty rule arrays are provided', () => {
    expect(() =>
      FieldRedactor.createSafe({
        secretKeys: [],
        deepSecretKeys: [],
        customObjects: []
      })
    ).toThrow(FieldRedactorConfigurationError);
  });

  it('does not redact unrelated fields when secretKeys are explicit', () => {
    const redactor = FieldRedactor.createSafe({ secretKeys: [/email/] });
    const result = redactor.redactSync({ email: 'alice@example.com', username: 'alice' });
    expect(result).toEqual({ email: 'REDACTED', username: 'alice' });
  });
});

describe('FieldRedactor constructor explicit rules', () => {
  it('throws when constructed with no rules', () => {
    expect(() => new FieldRedactor()).toThrow(FieldRedactorConfigurationError);
    expect(() => new FieldRedactor({})).toThrow(/requires at least one non-empty/);
  });

  it('createSafe and constructor share the same guard', () => {
    expect(() => new FieldRedactor({})).toThrow(FieldRedactorConfigurationError);
    expect(() => FieldRedactor.createSafe({})).toThrow(FieldRedactorConfigurationError);
  });
});
