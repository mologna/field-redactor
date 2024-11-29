import { SecretManager } from "../../../src/new/secret/secretManager";

describe('NewSecretManager', () => {
  it('Can create a new secret manager which returns true for any key if no secrets given', () => {
    const secretManager = new SecretManager();
    expect(secretManager.isSecretKey('foo')).toBe(true);
    expect(secretManager.isSecretKey('bar')).toBe(true);
    expect(secretManager.isSecretKey('baz')).toBe(true);
    expect(secretManager.isSecretKey('qux')).toBe(true);
  });

  it('Can create a secret manager which return true for keys that match', () => {
    const secretManager = new SecretManager([/foo/, /^pass/]);
    expect(secretManager.isSecretKey('foo')).toBe(true);
    expect(secretManager.isSecretKey('bar')).toBe(false);
    expect(secretManager.isSecretKey('pass')).toBe(true);
    expect(secretManager.isSecretKey('password')).toBe(true);
    expect(secretManager.isSecretKey('superpass')).toBe(false);
  });
});