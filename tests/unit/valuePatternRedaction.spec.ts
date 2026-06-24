import { FieldRedactor, FieldRedactorConfigBuilder } from '../../src';

const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const EMAIL_PATTERN_LABEL = `/${EMAIL_PATTERN.source}/${EMAIL_PATTERN.flags}`;

describe('value pattern redaction', () => {
  it('redacts scalar values that match valuePatterns regardless of key name', () => {
    const redactor = FieldRedactor.createSafe({
      valuePatterns: [EMAIL_PATTERN]
    });

    const input = {
      description: 'Contact alice@example.com for details',
      note: 'no pii here'
    };

    const result = redactor.redactSync(input);

    expect(result.description).toBe('REDACTED');
    expect(result.note).toBe('no pii here');
    expect(input.description).toBe('Contact alice@example.com for details');
  });

  it('does not override key-based shallow redaction precedence', () => {
    const redactor = FieldRedactor.createSafe({
      secretKeys: [/email/],
      valuePatterns: [EMAIL_PATTERN]
    });

    const { report } = redactor.dryRunSync({
      email: 'alice@example.com',
      description: 'reach alice@example.com'
    });

    expect(report.pathRules).toEqual(
      expect.arrayContaining([
        { path: 'email', action: 'redact', rule: 'shallow', pattern: '/email/' },
        { path: 'description', action: 'redact', rule: 'value', pattern: EMAIL_PATTERN_LABEL }
      ])
    );
  });

  it('attributes value-pattern matches in dryRun pathRules', () => {
    const redactor = FieldRedactor.createSafe({ valuePatterns: [EMAIL_PATTERN] });
    const { report } = redactor.dryRunSync({ body: 'alice@example.com' });

    expect(report.redactedPaths).toEqual(['body']);
    expect(report.pathRules).toEqual([
      { path: 'body', action: 'redact', rule: 'value', pattern: EMAIL_PATTERN_LABEL }
    ]);
  });

  it('supports builder valuePattern()', () => {
    const redactor = FieldRedactorConfigBuilder.create()
      .valuePattern(EMAIL_PATTERN)
      .buildSafeRedactor();

    const result = redactor.redactSync({ message: 'alice@example.com' });
    expect(result.message).toBe('REDACTED');
  });

  it('allows valuePatterns-only createSafe config with empty secretKeys semantics', () => {
    expect(() => FieldRedactor.createSafe({ valuePatterns: [EMAIL_PATTERN] })).not.toThrow();
  });

  it('does not redact non-string primitives unless the string form matches', () => {
    const redactor = FieldRedactor.createSafe({ valuePatterns: [/^123$/] });

    expect(redactor.redactSync({ count: 123 }).count).toBe('REDACTED');
    expect(redactor.redactSync({ count: 456 }).count).toBe(456);
    expect(redactor.redactSync({ active: true }).active).toBe(true);
  });

  it('merges valuePatterns from usePreset partial config', () => {
    const redactor = FieldRedactorConfigBuilder.create()
      .usePreset({ valuePatterns: [/example\.com/] })
      .valuePattern(/555/)
      .buildSafeRedactor();

    const result = redactor.redactSync({
      body: 'alice@example.com',
      note: 'call 555-1234'
    });

    expect(result.body).toBe('REDACTED');
    expect(result.note).toBe('REDACTED');
  });

  it('does not attribute value rule when an object value is redacted opaquely', () => {
    const redactor = FieldRedactor.createSafe({
      fullSecretKeys: [/payload/],
      valuePatterns: [/email/]
    });

    const { report } = redactor.dryRunSync({ payload: { email: 'alice@example.com' } });
    expect(report.pathRules).toEqual([{ path: 'payload', action: 'redact', rule: 'opaque', pattern: '/payload/' }]);
  });
});
