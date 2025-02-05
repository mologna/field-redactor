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

  it('Returns true for secretKeys only if they match the provided RegEx values and does not return true for other secret types on the same values', () => {
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

  it('Returns true for deepSecretKeys only if they match the provided RegEx values and does not return true for other secret types on the same values', () => {
    const secretManager = new SecretManager({
      deepSecretKeys: [/foo/, /^pass/]
    });

    expect(secretManager.isDeepSecretKey('foo')).toBe(true);
    expect(secretManager.isDeepSecretKey('bar')).toBe(false);
    expect(secretManager.isDeepSecretKey('pass')).toBe(true);
    expect(secretManager.isDeepSecretKey('password')).toBe(true);
    expect(secretManager.isFullSecretKey('superpass')).toBe(false);

    expect(secretManager.isFullSecretKey('foo')).toBe(false);
    expect(secretManager.isFullSecretKey('pass')).toBe(false);
    expect(secretManager.isSecretKey('foo')).toBe(false);
    expect(secretManager.isSecretKey('pass')).toBe(false);
  });

  it('Returns true for fullSecretKeys only if they match the provided RegEx values and does not return true for other secret types on the same values', () => {
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
    expect(secretManager.isSecretKey('foo')).toBe(false);
    expect(secretManager.isSecretKey('pass')).toBe(false);
  });

  it('Returns true for deleteSecretKeys only if they match the provided RegEx values and does not return true for other secret types on the same values', () => {
    const secretManager = new SecretManager({
      deleteSecretKeys: [/foo/, /^pass/]
    });

    expect(secretManager.isDeleteSecretKey('foo')).toBe(true);
    expect(secretManager.isDeleteSecretKey('bar')).toBe(false);
    expect(secretManager.isDeleteSecretKey('pass')).toBe(true);
    expect(secretManager.isDeleteSecretKey('password')).toBe(true);
    expect(secretManager.isDeleteSecretKey('superpass')).toBe(false);

    expect(secretManager.isDeepSecretKey('foo')).toBe(false);
    expect(secretManager.isDeepSecretKey('pass')).toBe(false);
    expect(secretManager.isSecretKey('foo')).toBe(false);
    expect(secretManager.isSecretKey('pass')).toBe(false);
  });

  it('Does not default to all values being secret if either deepSecretKeys, fullSecretKeys, or both are provided', () => {
    // deep secret
    const deepSecretManager = new SecretManager({
      deepSecretKeys: [/foo/]
    });
    expect(deepSecretManager.isSecretKey('foo')).toBe(false);
    expect(deepSecretManager.isSecretKey('bar')).toBe(false);
    expect(deepSecretManager.isSecretKey('hello')).toBe(false);

    // full secret
    const fullSecretManager = new SecretManager({
      fullSecretKeys: [/foo/]
    });
    expect(fullSecretManager.isSecretKey('foo')).toBe(false);
    expect(fullSecretManager.isSecretKey('bar')).toBe(false);
    expect(fullSecretManager.isSecretKey('hello')).toBe(false);

    // both
    const combinedSecretManager = new SecretManager({
      fullSecretKeys: [/foo/],
      deepSecretKeys: [/bar/]
    });
    expect(combinedSecretManager.isSecretKey('foo')).toBe(false);
    expect(combinedSecretManager.isSecretKey('bar')).toBe(false);
    expect(combinedSecretManager.isSecretKey('hello')).toBe(false);
  });

  it('Can return correct boolean values for a secret manager with all config types', () => {
    const secretManager = new SecretManager({
      secretKeys: [/foo/, /^pass/],
      deepSecretKeys: [/parentAccount/],
      fullSecretKeys: [/redactMe/],
      deleteSecretKeys: [/deleteMe/]
    });

    // secretKeys
    expect(secretManager.isSecretKey('parentAccount')).toBe(false);
    expect(secretManager.isSecretKey('foo')).toBe(true);
    expect(secretManager.isSecretKey('pass')).toBe(true);
    expect(secretManager.isSecretKey('redactMe')).toBe(false);
    expect(secretManager.isSecretKey('deleteMe')).toBe(false);

    // deep secret keys
    expect(secretManager.isDeepSecretKey('foo')).toBe(false);
    expect(secretManager.isDeepSecretKey('pass')).toBe(false);
    expect(secretManager.isDeepSecretKey('redactMe')).toBe(false);
    expect(secretManager.isDeepSecretKey('parentAccount')).toBe(true);
    expect(secretManager.isDeepSecretKey('deleteMe')).toBe(false);

    // full redaction keys
    expect(secretManager.isFullSecretKey('parentAccount')).toBe(false);
    expect(secretManager.isFullSecretKey('foo')).toBe(false);
    expect(secretManager.isFullSecretKey('pass')).toBe(false);
    expect(secretManager.isFullSecretKey('redactMe')).toBe(true);
    expect(secretManager.isFullSecretKey('deleteMe')).toBe(false);

    // delete redaction keys
    expect(secretManager.isDeleteSecretKey('parentAccount')).toBe(false);
    expect(secretManager.isDeleteSecretKey('foo')).toBe(false);
    expect(secretManager.isDeleteSecretKey('pass')).toBe(false);
    expect(secretManager.isDeleteSecretKey('redactMe')).toBe(false);
    expect(secretManager.isDeleteSecretKey('deleteMe')).toBe(true);
  });
});
