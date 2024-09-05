import { TypeCheckers } from '../../src/utils/typeCheckers';

describe('TypeCheckers', () => {
  describe('isSecretConfig', () => {
    it('Returns true for valid configs', () => {
      expect(TypeCheckers.isSecretConfig({})).toBeTruthy();
      expect(TypeCheckers.isSecretConfig({ redactAll: true })).toBeTruthy();
      expect(TypeCheckers.isSecretConfig({ deep: true })).toBeTruthy();
      expect(TypeCheckers.isSecretConfig({ keys: [/foo/] })).toBeTruthy();
      expect(
        TypeCheckers.isSecretConfig({ ignoredKeys: [/foo/] })
      ).toBeTruthy();
      expect(
        TypeCheckers.isSecretConfig({
          redactAll: true,
          deep: true,
          ignoredKeys: [/foo/]
        })
      ).toBeTruthy();
      expect(
        TypeCheckers.isSecretConfig({
          redactAll: true,
          deep: true,
          keys: [/foo/]
        })
      ).toBeTruthy();
    });

    it('Returns false if redactAll or deep is not a boolean value', () => {
      expect(TypeCheckers.isSecretConfig({ redactAll: 'foobar' })).toBeFalsy();
      expect(TypeCheckers.isSecretConfig({ deep: 'foobar' })).toBeFalsy();
    });

    it('Returns false if keys is defined but not an array or not an array of RegExp', () => {
      expect(
        TypeCheckers.isSecretConfig({
          keys: 'foobar'
        })
      ).toBeFalsy();
      expect(
        TypeCheckers.isSecretConfig({
          keys: ['true']
        })
      ).toBeFalsy();
      expect(
        TypeCheckers.isSecretConfig({
          keys: [/foo/, 'bar']
        })
      ).toBeFalsy();
    });

    it('Returns false if ignoredKeys is defined but not an array or not an array of RegExp', () => {
      expect(
        TypeCheckers.isSecretConfig({
          ignoredKeys: 'foobar'
        })
      ).toBeFalsy();
      expect(
        TypeCheckers.isSecretConfig({
          ignoredKeys: ['true']
        })
      ).toBeFalsy();
      expect(
        TypeCheckers.isSecretConfig({
          ignoredKeys: [/foo/, 'bar']
        })
      ).toBeFalsy();
    });
  });

  describe('isValuesConfig', () => {
    it('Returns true for valid configs', () => {
      expect(TypeCheckers.isValuesConfig({})).toBeTruthy();
      expect(TypeCheckers.isValuesConfig({ booleans: true })).toBeTruthy();
      expect(TypeCheckers.isValuesConfig({ dates: true })).toBeTruthy();
      expect(TypeCheckers.isValuesConfig({ functions: true })).toBeTruthy();
    });

    it('Returns false for any invalid values', () => {
      expect(TypeCheckers.isValuesConfig({ booleans: 'foobar' })).toBeFalsy();
      expect(TypeCheckers.isValuesConfig({ dates: 'foobar' })).toBeFalsy();
      expect(TypeCheckers.isValuesConfig({ functions: 'foobar' })).toBeFalsy();
    });
  });
});
