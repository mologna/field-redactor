import { PrimitiveRedactor } from '../../src/engine/primitiveRedactor';

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

  it('Can redact values synchronously with the default redactor', () => {
    const redactor = new PrimitiveRedactor({
      ignoreNullOrUndefined: false,
      ignoreBooleans: false
    });

    expect(redactor.redactValueSync('foobar')).toBe(DEFAULT_REDACTED_TEXT);
    expect(redactor.usesAsyncRedactor()).toBe(false);
  });

  it('Can redact values synchronously with syncRedactor configuration', () => {
    const redactor = new PrimitiveRedactor({
      syncRedactor: () => 'CUSTOM',
      ignoreBooleans: false,
      ignoreNullOrUndefined: true
    });

    expect(redactor.redactValueSync('foobar')).toBe('CUSTOM');
    expect(redactor.usesAsyncRedactor()).toBe(false);
  });

  it('Uses async mode when only async redactor is configured', () => {
    const redactor = new PrimitiveRedactor({
      redactor: (val) => Promise.resolve('CUSTOM'),
      ignoreBooleans: false,
      ignoreNullOrUndefined: true
    });

    expect(redactor.usesAsyncRedactor()).toBe(true);
  });

  it('Throws from redactValueSync when only async redactor is configured', () => {
    const redactor = new PrimitiveRedactor({
      redactor: (val) => Promise.resolve('CUSTOM'),
      ignoreBooleans: false,
      ignoreNullOrUndefined: false
    });

    expect(() => redactor.redactValueSync('foobar')).toThrow(
      'Sync redaction is not available without syncRedactor configuration'
    );
  });

  it('Redacts empty string and zero when ignoreNullOrUndefined is false', async () => {
    const redactor = new PrimitiveRedactor({
      ignoreNullOrUndefined: false,
      ignoreBooleans: false
    });

    await expect(redactor.redactValue('')).resolves.toBe(DEFAULT_REDACTED_TEXT);
    await expect(redactor.redactValue(0)).resolves.toBe(DEFAULT_REDACTED_TEXT);
    expect(redactor.redactValueSync('')).toBe(DEFAULT_REDACTED_TEXT);
    expect(redactor.redactValueSync(0)).toBe(DEFAULT_REDACTED_TEXT);
  });

  it('Coerces numbers and booleans to strings for custom redactors', async () => {
    const seen: unknown[] = [];
    const redactor = new PrimitiveRedactor({
      syncRedactor: (val) => {
        seen.push(val);
        return typeof val === 'string' ? `REDACTED:${val}` : 'UNEXPECTED';
      },
      ignoreBooleans: false,
      ignoreNullOrUndefined: false
    });

    expect(redactor.redactValueSync(1234567890)).toBe('REDACTED:1234567890');
    expect(redactor.redactValueSync(0)).toBe('REDACTED:0');
    expect(redactor.redactValueSync(true)).toBe('REDACTED:true');
    expect(redactor.redactValueSync('already')).toBe('REDACTED:already');
    await expect(redactor.redactValue(12.5)).resolves.toBe('REDACTED:12.5');
    expect(seen).toEqual(['1234567890', '0', 'true', 'already', '12.5']);
  });

  it('Does not coerce null or undefined before calling the redactor', async () => {
    const seen: unknown[] = [];
    const redactor = new PrimitiveRedactor({
      syncRedactor: (val) => {
        seen.push(val);
        return 'REDACTED_NULLISH';
      },
      ignoreBooleans: false,
      ignoreNullOrUndefined: false
    });

    expect(redactor.redactValueSync(null)).toBe('REDACTED_NULLISH');
    expect(redactor.redactValueSync(undefined)).toBe('REDACTED_NULLISH');
    expect(seen).toEqual([null, undefined]);
  });
});
