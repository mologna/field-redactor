import { SecretManager } from '../../src/secretManager';

describe('NewSecretManager', () => {
  it('Returns true for any key if no secrets given', () => {
    const secretManager = new SecretManager({});
    expect(secretManager.isSecretKey('foo')).toBe(true);
    expect(secretManager.isSecretKey('bar')).toBe(true);
    expect(secretManager.isSecretKey('baz')).toBe(true);
    expect(secretManager.isSecretKey('qux')).toBe(true);
    expect(secretManager.isDeepSecretKey('qux')).toBe(false);
    expect(secretManager.isFullSecretKey('qux')).toBe(false);
  });

  it('Should not consider all values secret if deepSecretKeys or fullSecretKeys are provided', () => {
    // deep secret
    const deepSecretManager = new SecretManager({
      deepSecretKeys: [/foo/]
    });
    expect(deepSecretManager.isSecretKey('foo')).toBe(false);
    expect(deepSecretManager.isSecretKey('bar')).toBe(false);
    expect(deepSecretManager.isDeepSecretKey('foo')).toBe(true);

    // full secret
    const fullSecretManager = new SecretManager({
      fullSecretKeys: [/foo/]
    });
    expect(fullSecretManager.isSecretKey('foo')).toBe(false);
    expect(fullSecretManager.isSecretKey('bar')).toBe(false);
    expect(fullSecretManager.isFullSecretKey('foo')).toBe(true);

    // both
    const combinedSecretManager = new SecretManager({
      fullSecretKeys: [/foo/],
      deepSecretKeys: [/bar/]
    });
    expect(combinedSecretManager.isSecretKey('foo')).toBe(false);
    expect(combinedSecretManager.isSecretKey('bar')).toBe(false);
    expect(combinedSecretManager.isSecretKey('hello')).toBe(false);
    expect(combinedSecretManager.isFullSecretKey('foo')).toBe(true);
    expect(combinedSecretManager.isDeepSecretKey('bar')).toBe(true);
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
    expect(secretManager.isDeepSecretKey('foo')).toBe(false);
    expect(secretManager.isDeepSecretKey('pass')).toBe(false);
    expect(secretManager.isFullSecretKey('foo')).toBe(false);
    expect(secretManager.isFullSecretKey('pass')).toBe(false);
  });

  it('Returns true for fullRedactionKeys that match', () => {
    const secretManager = new SecretManager({
      fullSecretKeys: [/foo/, /^pass/]
    });

    expect(secretManager.isFullSecretKey('foo')).toBe(true);
    expect(secretManager.isFullSecretKey('bar')).toBe(false);
    expect(secretManager.isFullSecretKey('pass')).toBe(true);
    expect(secretManager.isFullSecretKey('password')).toBe(true);
    expect(secretManager.isFullSecretKey('superpass')).toBe(false);

    expect(secretManager.isDeepSecretKey('foo')).toBe(false);
    expect(secretManager.isDeepSecretKey('pass')).toBe(false);
  });

  it('Returns true for for matches on a SecretManager that includes all config types, otherwise false', () => {
    const secretManager = new SecretManager({
      secretKeys: [/foo/, /^pass/],
      deepSecretKeys: [/parentAccount/],
      fullSecretKeys: [/redactMe/]
    });

    // secretKeys
    expect(secretManager.isSecretKey('parentAccount')).toBe(false);
    expect(secretManager.isSecretKey('foo')).toBe(true);
    expect(secretManager.isSecretKey('pass')).toBe(true);
    expect(secretManager.isSecretKey('redactMe')).toBe(false);

    // deep secret keys
    expect(secretManager.isDeepSecretKey('foo')).toBe(false);
    expect(secretManager.isDeepSecretKey('pass')).toBe(false);
    expect(secretManager.isDeepSecretKey('redactMe')).toBe(false);
    expect(secretManager.isDeepSecretKey('parentAccount')).toBe(true);

    // full redaction keys
    expect(secretManager.isFullSecretKey('parentAccount')).toBe(false);
    expect(secretManager.isFullSecretKey('foo')).toBe(false);
    expect(secretManager.isFullSecretKey('pass')).toBe(false);
    expect(secretManager.isFullSecretKey('redactMe')).toBe(true);
  });
});
