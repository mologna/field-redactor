import { PrimitiveRedactor } from '../../src/primitiveRedactor';

describe('PrimitiveRedactor', () => {
  const DEFAULT_REDACTED_TEXT = 'REDACTED';
  it('Can redact values of any primitive type', async () => {
    const redactor = new PrimitiveRedactor({
      ignoreNullOrUndefined: false,
      ignoreBooleans: false
    });

    await expect(redactor.redactValue('foobar')).resolves.toBe(DEFAULT_REDACTED_TEXT);
    await expect(redactor.redactValue(1)).resolves.toBe(DEFAULT_REDACTED_TEXT);
    await expect(redactor.redactValue(12.12)).resolves.toBe(DEFAULT_REDACTED_TEXT);
    await expect(redactor.redactValue(null)).resolves.toBe(DEFAULT_REDACTED_TEXT);
    await expect(redactor.redactValue(undefined)).resolves.toBe(DEFAULT_REDACTED_TEXT);
    await expect(redactor.redactValue(true)).resolves.toBe(DEFAULT_REDACTED_TEXT);
    await expect(redactor.redactValue(false)).resolves.toBe(DEFAULT_REDACTED_TEXT);
  });

  it('Can be configured to not redact null or undefined values but still redact others', async () => {
    const redactor = new PrimitiveRedactor({
      ignoreNullOrUndefined: true,
      ignoreBooleans: false
    });

    await expect(redactor.redactValue(null)).resolves.toBe(null);
    await expect(redactor.redactValue(undefined)).resolves.toBe(undefined);
    await expect(redactor.redactValue('foobar')).resolves.toBe(DEFAULT_REDACTED_TEXT);
    await expect(redactor.redactValue(1)).resolves.toBe(DEFAULT_REDACTED_TEXT);
    await expect(redactor.redactValue(12.12)).resolves.toBe(DEFAULT_REDACTED_TEXT);
    await expect(redactor.redactValue(true)).resolves.toBe(DEFAULT_REDACTED_TEXT);
    await expect(redactor.redactValue(false)).resolves.toBe(DEFAULT_REDACTED_TEXT);
  });

  it('Can be configured to not redact boolean values but still redact others', async () => {
    const redactor = new PrimitiveRedactor({
      ignoreNullOrUndefined: false,
      ignoreBooleans: true
    });

    await expect(redactor.redactValue(true)).resolves.toBe(true);
    await expect(redactor.redactValue(false)).resolves.toBe(false);
    await expect(redactor.redactValue('foobar')).resolves.toBe(DEFAULT_REDACTED_TEXT);
    await expect(redactor.redactValue(1)).resolves.toBe(DEFAULT_REDACTED_TEXT);
    await expect(redactor.redactValue(12.12)).resolves.toBe(DEFAULT_REDACTED_TEXT);
    await expect(redactor.redactValue(null)).resolves.toBe(DEFAULT_REDACTED_TEXT);
    await expect(redactor.redactValue(undefined)).resolves.toBe(DEFAULT_REDACTED_TEXT);
  });

  it('can be configured with a custom redactor', async () => {
    const redactor = new PrimitiveRedactor({
      redactor: (val) => Promise.resolve('CUSTOM'),
      ignoreBooleans: false,
      ignoreNullOrUndefined: true
    });

    await expect(redactor.redactValue('foobar')).resolves.toBe('CUSTOM');
  });
});
