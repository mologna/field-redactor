import { SecretManager } from '../../src/rules/secretManager';

describe('NewSecretManager', () => {
  it('Returns true for any key if no secrets given', () => {
    const secretManager = new SecretManager({});
    expect(secretManager.isSecretKey('foo')).toBe(true);
    expect(secretManager.isSecretKey('bar')).toBe(true);
    expect(secretManager.isSecretKey('baz')).toBe(true);
    expect(secretManager.isSecretKey('qux')).toBe(true);
    expect(secretManager.isDeepSecretKey('qux')).toBe(false);
    expect(secretManager.isOpaqueSecretKey('qux')).toBe(false);
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
    expect(secretManager.isOpaqueSecretKey('foo')).toBe(false);
    expect(secretManager.isOpaqueSecretKey('pass')).toBe(false);
  });

  it('Returns true for deepSecretKeys only if they match the provided RegEx values and does not return true for other secret types on the same values', () => {
    const secretManager = new SecretManager({
      deepSecretKeys: [/foo/, /^pass/]
    });

    expect(secretManager.isDeepSecretKey('foo')).toBe(true);
    expect(secretManager.isDeepSecretKey('bar')).toBe(false);
    expect(secretManager.isDeepSecretKey('pass')).toBe(true);
    expect(secretManager.isDeepSecretKey('password')).toBe(true);
    expect(secretManager.isOpaqueSecretKey('superpass')).toBe(false);

    expect(secretManager.isOpaqueSecretKey('foo')).toBe(false);
    expect(secretManager.isOpaqueSecretKey('pass')).toBe(false);
    expect(secretManager.isSecretKey('foo')).toBe(false);
    expect(secretManager.isSecretKey('pass')).toBe(false);
  });

  it('Returns true for opaqueSecretKeys only if they match the provided RegEx values and does not return true for other secret types on the same values', () => {
    const secretManager = new SecretManager({
      opaqueSecretKeys: [/foo/, /^pass/]
    });

    expect(secretManager.isOpaqueSecretKey('foo')).toBe(true);
    expect(secretManager.isOpaqueSecretKey('bar')).toBe(false);
    expect(secretManager.isOpaqueSecretKey('pass')).toBe(true);
    expect(secretManager.isOpaqueSecretKey('password')).toBe(true);
    expect(secretManager.isOpaqueSecretKey('superpass')).toBe(false);

    expect(secretManager.isDeepSecretKey('foo')).toBe(false);
    expect(secretManager.isDeepSecretKey('pass')).toBe(false);
    expect(secretManager.isSecretKey('foo')).toBe(false);
    expect(secretManager.isSecretKey('pass')).toBe(false);
  });

  it('Returns true for removeSecretKeys only if they match the provided RegEx values and does not return true for other secret types on the same values', () => {
    const secretManager = new SecretManager({
      removeSecretKeys: [/foo/, /^pass/]
    });

    expect(secretManager.isRemoveSecretKey('foo')).toBe(true);
    expect(secretManager.isRemoveSecretKey('bar')).toBe(false);
    expect(secretManager.isRemoveSecretKey('pass')).toBe(true);
    expect(secretManager.isRemoveSecretKey('password')).toBe(true);
    expect(secretManager.isRemoveSecretKey('superpass')).toBe(false);

    expect(secretManager.isDeepSecretKey('foo')).toBe(false);
    expect(secretManager.isDeepSecretKey('pass')).toBe(false);
    expect(secretManager.isSecretKey('foo')).toBe(false);
    expect(secretManager.isSecretKey('pass')).toBe(false);
  });

  it('Does not default to all values being secret if either deepSecretKeys, opaqueSecretKeys, or both are provided', () => {
    // deep secret
    const deepSecretManager = new SecretManager({
      deepSecretKeys: [/foo/]
    });
    expect(deepSecretManager.isSecretKey('foo')).toBe(false);
    expect(deepSecretManager.isSecretKey('bar')).toBe(false);
    expect(deepSecretManager.isSecretKey('hello')).toBe(false);

    // full secret
    const fullSecretManager = new SecretManager({
      opaqueSecretKeys: [/foo/]
    });
    expect(fullSecretManager.isSecretKey('foo')).toBe(false);
    expect(fullSecretManager.isSecretKey('bar')).toBe(false);
    expect(fullSecretManager.isSecretKey('hello')).toBe(false);

    // both
    const combinedSecretManager = new SecretManager({
      opaqueSecretKeys: [/foo/],
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
      opaqueSecretKeys: [/redactMe/],
      removeSecretKeys: [/deleteMe/]
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
    expect(secretManager.isOpaqueSecretKey('parentAccount')).toBe(false);
    expect(secretManager.isOpaqueSecretKey('foo')).toBe(false);
    expect(secretManager.isOpaqueSecretKey('pass')).toBe(false);
    expect(secretManager.isOpaqueSecretKey('redactMe')).toBe(true);
    expect(secretManager.isOpaqueSecretKey('deleteMe')).toBe(false);

    // delete redaction keys
    expect(secretManager.isRemoveSecretKey('parentAccount')).toBe(false);
    expect(secretManager.isRemoveSecretKey('foo')).toBe(false);
    expect(secretManager.isRemoveSecretKey('pass')).toBe(false);
    expect(secretManager.isRemoveSecretKey('redactMe')).toBe(false);
    expect(secretManager.isRemoveSecretKey('deleteMe')).toBe(true);
  });

  it('returns true for passKeys only when configured and matching', () => {
    const secretManager = new SecretManager({ passKeys: [/^id$/, /profile/] });

    expect(secretManager.isPassKey('id')).toBe(true);
    expect(secretManager.isPassKey('profile')).toBe(true);
    expect(secretManager.isPassKey('ssn')).toBe(false);

    expect(new SecretManager({}).isPassKey('id')).toBe(false);
  });

  it('classifies key rules by precedence and falls back to default shallow matching', () => {
    const manager = new SecretManager({
      secretKeys: [/shallow/],
      deepSecretKeys: [/deep/],
      opaqueSecretKeys: [/opaque/],
      removeSecretKeys: [/removed/]
    });

    expect(manager.classifyKeyRule('removed')).toBe('remove');
    expect(manager.classifyKeyRule('opaque')).toBe('opaque');
    expect(manager.classifyKeyRule('deep')).toBe('deep');
    expect(manager.classifyKeyRule('shallow')).toBe('shallow');
    expect(manager.classifyKeyRule('other')).toBe(null);
    expect(manager.getKeyRulePattern('shallow', 'shallow')).toBeDefined();
    expect(manager.getKeyRulePattern('other', 'shallow')).toBeUndefined();

    const defaultManager = new SecretManager({});
    expect(defaultManager.classifyKeyRule('anything')).toBe('default');
  });

  it('accepts legacy fullSecretKeys / deleteSecretKeys as opaque / remove', () => {
    const manager = new SecretManager({
      fullSecretKeys: [/payload/],
      deleteSecretKeys: [/authKey/]
    });

    expect(manager.isOpaqueSecretKey('payload')).toBe(true);
    expect(manager.isRemoveSecretKey('authKey')).toBe(true);
    expect(manager.isSecretKey('other')).toBe(false);
  });
});
