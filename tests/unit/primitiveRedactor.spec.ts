import { PrimitiveRedactor } from '../../src/primitiveRedactor';

describe('PrimitiveRedactor', () => {
  const DEFAULT_REDACTED_TEXT = 'REDACTED';
  it('Can redact a value of any type with correct default redaction logic', async () => {
    const redactor = new PrimitiveRedactor({});

    await expect(redactor.redactValue('foobar')).resolves.toBe(DEFAULT_REDACTED_TEXT);
    await expect(redactor.redactValue(1)).resolves.toBe(DEFAULT_REDACTED_TEXT);
    await expect(redactor.redactValue(12.12)).resolves.toBe(DEFAULT_REDACTED_TEXT);
  });

  it('can be configured with a custom redactor', async () => {
    const redactor = new PrimitiveRedactor({ redactor: (val) => Promise.resolve('CUSTOM') });
    await expect(redactor.redactValue('foobar')).resolves.toBe('CUSTOM');
  });

  it('Does not redact null or undefined values by default', async () => {
    const redactor = new PrimitiveRedactor({});

    await expect(redactor.redactValue(null)).resolves.toBe(null);
    await expect(redactor.redactValue(undefined)).resolves.toBe(undefined);
  });

  it('Can redact null or undefined values when specified', async () => {
    const redactor = new PrimitiveRedactor({
      ignoreNullOrUndefined: false
    });

    await expect(redactor.redactValue(null)).resolves.toBe(DEFAULT_REDACTED_TEXT);
    await expect(redactor.redactValue(undefined)).resolves.toBe(DEFAULT_REDACTED_TEXT);
  });

  it('Redacts dates and booleans by default', async () => {
    const redactor = new PrimitiveRedactor({});

    await expect(redactor.redactValue(true)).resolves.toBe(DEFAULT_REDACTED_TEXT);
    await expect(redactor.redactValue(false)).resolves.toBe(DEFAULT_REDACTED_TEXT);
    await expect(redactor.redactValue(new Date())).resolves.toBe(DEFAULT_REDACTED_TEXT);
    await expect(redactor.redactValue(new Date().toISOString())).resolves.toBe(DEFAULT_REDACTED_TEXT);
    await expect(redactor.redactValue(new Date().toDateString())).resolves.toBe(DEFAULT_REDACTED_TEXT);
  });

  it('Ignores booleans when specified', async () => {
    const redactor = new PrimitiveRedactor({
      ignoreBooleans: true
    });

    await expect(redactor.redactValue(true)).resolves.toBe(true);
    await expect(redactor.redactValue(false)).resolves.toBe(false);
  });
});
