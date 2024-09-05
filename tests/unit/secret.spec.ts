import { SecretParserImpl } from '../../src/secrets/impl/secretParserImpl';

describe('ConfigSecretParser', () => {
  const regexList = [/foo/, /bar/, /.*end$/];
  const inRegex = ['foo', 'bar', 'foosh', 'rebar', 'somethingwithend'];
  const notInRegex = ['biz', 'baz', 'boosh', 'start', 'ending'];
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('Marks everything as secret if redactAll is passed', () => {
    const allSecrets = new SecretParserImpl({
      redactAll: true
    });

    const values = ['foo', 'bar', 'baz'];
    values.forEach((value: string) =>
      expect(allSecrets.isSecret(value)).toBeTruthy()
    );
  });

  it('Marks only selected fields as secret if keys passed', () => {
    const allSecrets = new SecretParserImpl({
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
    const allSecrets = new SecretParserImpl({
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
    const allSecrets = new SecretParserImpl({
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
