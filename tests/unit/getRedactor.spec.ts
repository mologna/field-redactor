import { getFieldRedactor } from '../../src/builders';
import { getHashStrategy } from '../../src/strategies/impl/hashStrategy';
import { SecretParserImpl } from '../../src/secrets/impl/secretParserImpl';
import { FieldRedactorImpl } from '../../src/fieldRedactor/impl/fieldRedactorImpl';
import { getRedactionStrategy } from '../../src/strategies';

jest.mock('../../src/strategies/impl/hashStrategy');
jest.mock('../../src/strategies/impl/redactionStrategy');
jest.mock('../../src/secrets/impl/secretParserImpl');
jest.mock('../../src/fieldRedactor/impl/fieldRedactorImpl');

describe('getRedactor', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });
  it('Can get a redactor with hash strategy and correct arguments', () => {
    getFieldRedactor({
      algorithm: 'md5'
    });
    expect(getHashStrategy).toHaveBeenCalledTimes(1);
    expect(getHashStrategy).toHaveBeenCalledWith('md5', undefined, undefined);

    getFieldRedactor({
      algorithm: 'md5',
      shouldFormat: true
    });
    expect(getHashStrategy).toHaveBeenCalledTimes(2);
    expect(getHashStrategy).toHaveBeenCalledWith('md5', undefined, true);
    getFieldRedactor({
      algorithm: 'md5',
      encoding: 'base64'
    });
    expect(getHashStrategy).toHaveBeenCalledTimes(3);
    expect(getHashStrategy).toHaveBeenCalledWith('md5', 'base64', undefined);
  });

  it('Can get a redactor with redaction strategy and correct arguments', () => {
    getFieldRedactor({
      redactor: (foo: string) => "bar"
    });
    expect(getRedactionStrategy).toHaveBeenCalledTimes(0);
    expect(getHashStrategy).toHaveBeenCalledTimes(0);
  });

  it('Can get a redactor with a user-supplied strategy and correct arguments', () => {
    getFieldRedactor();
    expect(getRedactionStrategy).toHaveBeenCalledTimes(1);
  });

  it('Creates the secret parser with the common correct configurations', () => {
    getFieldRedactor({
      redactAll: true
    });
    expect(SecretParserImpl).toHaveBeenCalledTimes(1);
    expect(SecretParserImpl).toHaveBeenCalledWith({
      redactAll: true,
      deepRedactSecrets: undefined,
      keys: undefined,
      ignoredKeys: undefined
    });

    getFieldRedactor({
      keys: [/foobar/]
    });
    expect(SecretParserImpl).toHaveBeenCalledTimes(2);
    expect(SecretParserImpl).toHaveBeenCalledWith({
      redactAll: undefined,
      keys: [/foobar/],
      ignoredKeys: undefined
    });

    getFieldRedactor({
      ignoredKeys: [/foobar/]
    });
    expect(SecretParserImpl).toHaveBeenCalledTimes(3);
    expect(SecretParserImpl).toHaveBeenCalledWith({
      redactAll: undefined,
      ignoredKeys: [/foobar/],
      keys: undefined
    });
  });

  it('Creates the redactor with the correct config', () => {
    getFieldRedactor();
    expect(FieldRedactorImpl).toHaveBeenCalledTimes(1);
    expect(FieldRedactorImpl).toHaveBeenCalledWith({
      redactor: undefined,
      secretParser: expect.anything(),
      values: {
        booleans: false,
        dates: false,
        functions: false
      },
      deepRedactSecrets: false
    });

    getFieldRedactor({
      values: {
        booleans: true,
        dates: true,
        functions: true
      },
      deepRedactSecrets: true
    });
    expect(FieldRedactorImpl).toHaveBeenCalledTimes(2);
    expect(FieldRedactorImpl).toHaveBeenCalledWith({
      redactor: undefined, // note: mocking makes this undefined
      secretParser: expect.anything(),
      values: {
        booleans: true,
        dates: true,
        functions: true
      },
      deepRedactSecrets: true
    });
  });

  it('Throws an error if invalid values config provided', () => {
    expect(() => {
      getFieldRedactor({
        values: {
          booleans: 'bar'
        }
      } as unknown as any);
    }).toThrow('Invalid values config type provided');
  });
});
