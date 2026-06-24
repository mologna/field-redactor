import { FieldRedactor, FieldRedactorError } from '../../src';

describe('FieldRedactor sync API', () => {
  it('redactSync redacts without requiring await', () => {
    const fieldRedactor = new FieldRedactor({
      secretKeys: [/password/]
    });

    const result = fieldRedactor.redactSync({
      username: 'alice',
      password: 'secret'
    });

    expect(result).toEqual({
      username: 'alice',
      password: 'REDACTED'
    });
  });

  it('redactInPlaceSync mutates in place', () => {
    const fieldRedactor = new FieldRedactor({
      secretKeys: [/password/]
    });

    const input = {
      username: 'alice',
      password: 'secret'
    };

    fieldRedactor.redactInPlaceSync(input);

    expect(input).toEqual({
      username: 'alice',
      password: 'REDACTED'
    });
  });

  it('redact resolves without per-field async overhead for default redactor', async () => {
    const fieldRedactor = new FieldRedactor({
      secretKeys: [/password/]
    });

    const result = await fieldRedactor.redact({
      password: 'secret'
    });

    expect(result).toEqual({ password: 'REDACTED' });
  });

  it('redactInPlaceSync throws when only async redactor is configured', () => {
    const fieldRedactor = new FieldRedactor({
      secretKeys: [/password/],
      redactor: (val) => Promise.resolve('CUSTOM')
    });

    expect(() => fieldRedactor.redactInPlaceSync({ password: 'secret' })).toThrow(FieldRedactorError);
  });

  it('syncRedactor is used when provided alongside async redactor', () => {
    const fieldRedactor = new FieldRedactor({
      secretKeys: [/password/],
      redactor: (val) => Promise.resolve('ASYNC'),
      syncRedactor: () => 'SYNC'
    });

    expect(fieldRedactor.redactSync({ password: 'secret' })).toEqual({ password: 'SYNC' });
  });

  it('redactInPlaceSync wraps thrown errors in FieldRedactorError', () => {
    const fieldRedactor = new FieldRedactor({
      secretKeys: [/password/],
      syncRedactor: () => {
        throw new Error('sync failure');
      }
    });

    expect(() => fieldRedactor.redactInPlaceSync({ password: 'secret' })).toThrow(
      new FieldRedactorError('sync failure')
    );
  });

  it('redactInPlace is a no-op for primitives on the sync path', async () => {
    const fieldRedactor = new FieldRedactor({
      secretKeys: [/password/]
    });

    const value = 'plain';
    await fieldRedactor.redactInPlace(value);
    expect(value).toBe('plain');
  });
});
