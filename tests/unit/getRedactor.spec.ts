import { getReadactor } from '../../src/builders';
import { HashStrategy } from '../../src/strategies/impl/hashStrategy';
import { RedactionStrategy } from '../../src/strategies/impl/redactionStrategy';
import { secretParserImpl } from '../../src/secrets/impl/secretParserImpl';
import { FieldRedactorImpl } from '../../src/fieldRedactor/impl/fieldRedactorImpl';

jest.mock('../../src/strategies/impl/hashStrategy');
jest.mock('../../src/strategies/impl/redactionStrategy');
jest.mock('../../src/secrets/impl/secretParserImpl');
jest.mock('../../src/fieldRedactor/impl/fieldRedactorImpl');

describe('getRedactor', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });
  it('Can get a redactor with hash strategy and correct arguments', () => {
    getReadactor({
      type: 'hash',
      algorithm: 'md5'
    });
    expect(HashStrategy).toHaveBeenCalledTimes(1);
    expect(HashStrategy).toHaveBeenCalledWith({
      type: 'hash',
      algorithm: 'md5'
    });

    getReadactor({
      type: 'hash',
      algorithm: 'md5',
      shouldFormat: true
    });
    expect(HashStrategy).toHaveBeenCalledTimes(2);
    expect(HashStrategy).toHaveBeenCalledWith({
      type: 'hash',
      algorithm: 'md5',
      shouldFormat: true
    });

    getReadactor({
      type: 'hash',
      algorithm: 'md5',
      encoding: 'base64'
    });
    expect(HashStrategy).toHaveBeenCalledTimes(3);
    expect(HashStrategy).toHaveBeenCalledWith({
      type: 'hash',
      algorithm: 'md5',
      encoding: 'base64'
    });
  });

  it('Can get a redactor with redaction strategy and correct arguments', () => {
    getReadactor();
    expect(RedactionStrategy).toHaveBeenCalledTimes(1);
    expect(RedactionStrategy).toHaveBeenCalledWith({ type: 'redaction' });

    getReadactor({ type: 'redaction' });
    expect(RedactionStrategy).toHaveBeenCalledTimes(2);
    expect(RedactionStrategy).toHaveBeenCalledWith({ type: 'redaction' });

    getReadactor({ type: 'redaction', replacementText: 'foobar' });
    expect(RedactionStrategy).toHaveBeenCalledTimes(3);
    expect(RedactionStrategy).toHaveBeenCalledWith({
      type: 'redaction',
      replacementText: 'foobar'
    });
  });

  it('Creates the secret parser with the common correct configurations', () => {
    getReadactor();
    expect(secretParserImpl).toHaveBeenCalledTimes(1);
    expect(secretParserImpl).toHaveBeenCalledWith({
      redactAll: undefined,
      deepRedactSecrets: undefined,
      keys: undefined,
      ignoredKeys: undefined
    });

    getReadactor({
      redactAll: true
    });
    expect(secretParserImpl).toHaveBeenCalledTimes(2);
    expect(secretParserImpl).toHaveBeenCalledWith({
      redactAll: true,
      deepRedactSecrets: undefined,
      keys: undefined,
      ignoredKeys: undefined
    });

    getReadactor({
      keys: [/foobar/]
    });
    expect(secretParserImpl).toHaveBeenCalledTimes(3);
    expect(secretParserImpl).toHaveBeenCalledWith({
      redactAll: undefined,
      keys: [/foobar/],
      ignoredKeys: undefined
    });

    getReadactor({
      ignoredKeys: [/foobar/]
    });
    expect(secretParserImpl).toHaveBeenCalledTimes(4);
    expect(secretParserImpl).toHaveBeenCalledWith({
      redactAll: undefined,
      ignoredKeys: [/foobar/],
      keys: undefined
    });
  });

  it('Creates the redactor with the correct config', () => {
    getReadactor();
    expect(FieldRedactorImpl).toHaveBeenCalledTimes(1);
    expect(FieldRedactorImpl).toHaveBeenCalledWith({
      redactor: expect.anything(),
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
    expect(FieldRedactorImpl).toHaveBeenCalledTimes(2);
    expect(FieldRedactorImpl).toHaveBeenCalledWith({
      redactor: expect.anything(),
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
