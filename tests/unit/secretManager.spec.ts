import { SecretManager } from '../../src/secretManager';

describe('NewSecretManager', () => {
  it('Returns true for any key if no secrets given', () => {
    const secretManager = new SecretManager({});
    expect(secretManager.isSecretKey('foo')).toBe(true);
    expect(secretManager.isSecretKey('bar')).toBe(true);
    expect(secretManager.isSecretKey('baz')).toBe(true);
    expect(secretManager.isSecretKey('qux')).toBe(true);
    expect(secretManager.isSecretObjectKey('qux')).toBe(false);
    expect(secretManager.isFullRedactionKey('qux')).toBe(false);
  });

  it('Returns true for secretKeys that match', () => {
    const secretManager = new SecretManager({
      secretKeys: [/foo/, /^pass/]
    });
    expect(secretManager.isSecretKey('foo')).toBe(true);
    expect(secretManager.isSecretKey('bar')).toBe(false);
    expect(secretManager.isSecretKey('pass')).toBe(true);
    expect(secretManager.isSecretKey('password')).toBe(true);
    expect(secretManager.isSecretKey('superpass')).toBe(false);
    expect(secretManager.isSecretObjectKey('foo')).toBe(false);
    expect(secretManager.isSecretObjectKey('pass')).toBe(false);
    expect(secretManager.isFullRedactionKey('foo')).toBe(false);
    expect(secretManager.isFullRedactionKey('pass')).toBe(false);
  });

  it('Returns true for fullRedactionKeys that match', () => {
    const secretManager = new SecretManager({
      fullRedactionKeys: [/foo/, /^pass/]
    });

    expect(secretManager.isFullRedactionKey('foo')).toBe(true);
    expect(secretManager.isFullRedactionKey('bar')).toBe(false);
    expect(secretManager.isFullRedactionKey('pass')).toBe(true);
    expect(secretManager.isFullRedactionKey('password')).toBe(true);
    expect(secretManager.isFullRedactionKey('superpass')).toBe(false);

    expect(secretManager.isSecretObjectKey('foo')).toBe(false);
    expect(secretManager.isSecretObjectKey('pass')).toBe(false);
  });

  it('Returns true for for matches on a SecretManager that includes all config types, otherwise false', () => {
    const secretManager = new SecretManager({
      secretKeys: [/foo/, /^pass/],
      deepSecretKeys: [/parentAccount/],
      fullRedactionKeys: [/redactMe/]
    });

    // secretKeys
    expect(secretManager.isSecretKey('parentAccount')).toBe(false);
    expect(secretManager.isSecretKey('foo')).toBe(true);
    expect(secretManager.isSecretKey('pass')).toBe(true);
    expect(secretManager.isSecretKey('redactMe')).toBe(false);

    // deep secret keys
    expect(secretManager.isSecretObjectKey('foo')).toBe(false);
    expect(secretManager.isSecretObjectKey('pass')).toBe(false);
    expect(secretManager.isSecretObjectKey('redactMe')).toBe(false);
    expect(secretManager.isSecretObjectKey('parentAccount')).toBe(true);

    // full redaction keys
    expect(secretManager.isFullRedactionKey('parentAccount')).toBe(false);
    expect(secretManager.isFullRedactionKey('foo')).toBe(false);
    expect(secretManager.isFullRedactionKey('pass')).toBe(false);
    expect(secretManager.isFullRedactionKey('redactMe')).toBe(true);
  });
});
