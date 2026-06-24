import rfdc from 'rfdc';
import { FieldRedactor } from '../../src';
import { validNestedInputWithAllTypes } from '../mocks/inputMocks';

describe('FieldRedactor copy-on-write', () => {
  const deepCopy = rfdc({ proto: true, circles: true });

  it('redactSync leaves the input untouched', () => {
    const fieldRedactor = new FieldRedactor({
      secretKeys: [/password/]
    });

    const input = {
      username: 'alice',
      password: 'secret',
      profile: { city: 'NYC' }
    };

    const result = fieldRedactor.redactSync(input);

    expect(input.password).toBe('secret');
    expect(result).not.toBe(input);
    expect(result).toEqual({
      username: 'alice',
      password: 'REDACTED',
      profile: { city: 'NYC' }
    });
  });

  it('redactSync shares unmodified subtrees with the input', () => {
    const fieldRedactor = new FieldRedactor({
      secretKeys: [/password/]
    });

    const profile = { city: 'NYC' };
    const input = {
      username: 'alice',
      password: 'secret',
      profile
    };

    const result = fieldRedactor.redactSync(input);

    expect(result.profile).toBe(profile);
  });

  it('cloneInput false mutates the input in place for redactSync', () => {
    const fieldRedactor = new FieldRedactor({
      secretKeys: [/password/],
      cloneInput: false
    });

    const input = { password: 'secret' };
    const result = fieldRedactor.redactSync(input);

    expect(result).toBe(input);
    expect(input.password).toBe('REDACTED');
  });

  it('cloneInput false mutates the input in place for redact', async () => {
    const fieldRedactor = new FieldRedactor({
      secretKeys: [/password/],
      cloneInput: false
    });

    const input = { password: 'secret' };
    const result = await fieldRedactor.redact(input);

    expect(result).toBe(input);
    expect(input.password).toBe('REDACTED');
  });

  it('redactCopyOnWrite matches deep-clone then redactInPlaceSync output', () => {
    const fieldRedactor = new FieldRedactor();
    const cowInput = deepCopy(validNestedInputWithAllTypes);
    const expectedInput = deepCopy(validNestedInputWithAllTypes);

    const cowResult = fieldRedactor.redactSync(cowInput);
    fieldRedactor.redactInPlaceSync(expectedInput);

    expect(cowResult).toEqual(expectedInput);
  });
});
