import { ConfigSecretParserImpl } from '../../src/secrets/impl/configSecretParserImpl';
import { SecretConfig } from '../../src/types/config';

describe('ConfigSecretParser', () => {
  const regexList = [/foo/, /bar/, /.*end$/];
  const inRegex = ['foo', 'bar', 'foosh', 'rebar', 'somethingwithend'];
  const notInRegex = ['biz', 'baz', 'boosh', 'start', 'ending'];
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('Throws an error if invalid config provided from a non-typescript application', () => {
    expect(
      () =>
        new ConfigSecretParserImpl({ keys: 'test' } as unknown as SecretConfig)
    ).toThrow('Invalid configuration provided for Secret Parser.');
  });

  it('Marks everything as secret if redactAll is passed', () => {
    const allSecrets = new ConfigSecretParserImpl({
      redactAll: true
    });

    const values = ['foo', 'bar', 'baz'];
    values.forEach((value: string) =>
      expect(allSecrets.isSecret(value)).toBeTruthy()
    );
  });

  it('Marks only selected fields as secret if keys passed', () => {
    const allSecrets = new ConfigSecretParserImpl({
      keys: regexList
    });

    inRegex.forEach((value: string) =>
      expect(allSecrets.isSecret(value)).toBeTruthy()
    );
    notInRegex.forEach((value: string) =>
      expect(allSecrets.isSecret(value)).toBeFalsy()
    );
  });

  it('Marks all fields as secret if redactAll passed even if not matching keys', () => {
    const allSecrets = new ConfigSecretParserImpl({
      keys: regexList,
      redactAll: true
    });

    inRegex.forEach((value: string) =>
      expect(allSecrets.isSecret(value)).toBeTruthy()
    );
    notInRegex.forEach((value: string) =>
      expect(allSecrets.isSecret(value)).toBeTruthy()
    );
  });

  it('Marks fields as ignored if passed in ignored list', () => {
    const allSecrets = new ConfigSecretParserImpl({
      ignoredKeys: regexList
    });

    inRegex.forEach((value: string) =>
      expect(allSecrets.isIgnored(value)).toBeTruthy()
    );
    notInRegex.forEach((value: string) =>
      expect(allSecrets.isIgnored(value)).toBeFalsy()
    );
  });
});
