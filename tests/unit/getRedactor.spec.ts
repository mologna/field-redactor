import { getReadactor } from '../../src/builders/getRedactor';
import { ConfigHashStrategy } from '../../src/strategies/impl/configHashStrategy';
import { ConfigRedactionStrategy } from '../../src/strategies/impl/configRedactionStrategy';
import { ConfigSecretParserImpl } from '../../src/secrets/impl/configSecretParserImpl';
import { ConfigObfuscatorImpl } from '../../src/obfuscator/impl/configObfuscatorImpl';

jest.mock('../../src/strategies/impl/configHashStrategy');
jest.mock('../../src/strategies/impl/configRedactionStrategy');
jest.mock('../../src/secrets/impl/configSecretParserImpl');
jest.mock('../../src/obfuscator/impl/configObfuscatorImpl');

describe('getRedactor', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });
  it('Can get a redactor with hash strategy and correct arguments', () => {
    getReadactor({
      type: 'hash',
      algorithm: 'md5'
    });
    expect(ConfigHashStrategy).toHaveBeenCalledTimes(1);
    expect(ConfigHashStrategy).toHaveBeenCalledWith({
      type: 'hash',
      algorithm: 'md5'
    });

    getReadactor({
      type: 'hash',
      algorithm: 'md5',
      shouldFormat: true
    });
    expect(ConfigHashStrategy).toHaveBeenCalledTimes(2);
    expect(ConfigHashStrategy).toHaveBeenCalledWith({
      type: 'hash',
      algorithm: 'md5',
      shouldFormat: true
    });

    getReadactor({
      type: 'hash',
      algorithm: 'md5',
      encoding: 'base64'
    });
    expect(ConfigHashStrategy).toHaveBeenCalledTimes(3);
    expect(ConfigHashStrategy).toHaveBeenCalledWith({
      type: 'hash',
      algorithm: 'md5',
      encoding: 'base64'
    });
  });

  it('Can get a redactor with redaction strategy and correct arguments', () => {
    getReadactor();
    expect(ConfigRedactionStrategy).toHaveBeenCalledTimes(1);
    expect(ConfigRedactionStrategy).toHaveBeenCalledWith({ type: 'redaction' });

    getReadactor({ type: 'redaction' });
    expect(ConfigRedactionStrategy).toHaveBeenCalledTimes(2);
    expect(ConfigRedactionStrategy).toHaveBeenCalledWith({ type: 'redaction' });

    getReadactor({ type: 'redaction', replacementText: 'foobar' });
    expect(ConfigRedactionStrategy).toHaveBeenCalledTimes(3);
    expect(ConfigRedactionStrategy).toHaveBeenCalledWith({
      type: 'redaction',
      replacementText: 'foobar'
    });
  });

  it('Creates the secret parser with the common correct configurations', () => {
    getReadactor();
    expect(ConfigSecretParserImpl).toHaveBeenCalledTimes(1);
    expect(ConfigSecretParserImpl).toHaveBeenCalledWith({
      redactAll: undefined,
      deepRedactSecrets: undefined,
      keys: undefined,
      ignoredKeys: undefined
    });

    getReadactor({
      redactAll: true
    });
    expect(ConfigSecretParserImpl).toHaveBeenCalledTimes(2);
    expect(ConfigSecretParserImpl).toHaveBeenCalledWith({
      redactAll: true,
      deepRedactSecrets: undefined,
      keys: undefined,
      ignoredKeys: undefined
    });

    getReadactor({
      keys: [/foobar/]
    });
    expect(ConfigSecretParserImpl).toHaveBeenCalledTimes(3);
    expect(ConfigSecretParserImpl).toHaveBeenCalledWith({
      redactAll: undefined,
      keys: [/foobar/],
      ignoredKeys: undefined
    });

    getReadactor({
      ignoredKeys: [/foobar/]
    });
    expect(ConfigSecretParserImpl).toHaveBeenCalledTimes(4);
    expect(ConfigSecretParserImpl).toHaveBeenCalledWith({
      redactAll: undefined,
      ignoredKeys: [/foobar/],
      keys: undefined
    });
  });

  it('Creates the redactor with the correct config', () => {
    getReadactor();
    expect(ConfigObfuscatorImpl).toHaveBeenCalledTimes(1);
    expect(ConfigObfuscatorImpl).toHaveBeenCalledWith({
      strategy: expect.anything(),
      secretParser: expect.anything(),
      values: {
        booleans: false,
        dates: false,
        functions: false
      },
      deepRedactSecrets: false
    });

    getReadactor({
      values: {
        booleans: true,
        dates: true,
        functions: true
      },
      deepRedactSecrets: true
    });
    expect(ConfigObfuscatorImpl).toHaveBeenCalledTimes(2);
    expect(ConfigObfuscatorImpl).toHaveBeenCalledWith({
      strategy: expect.anything(),
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
      getReadactor({
        values: {
          booleans: 'bar'
        }
      } as unknown as any);
    }).toThrow('Invalid values config type provided');
  });
});
