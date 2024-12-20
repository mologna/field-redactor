import moment from 'moment';
import { FieldRedactor } from '../../src/fieldRedactor';
import { PrimitiveRedactor } from '../../src/primitiveRedactor';
import { SecretManager } from '../../src/secretManager';
import { CustomObjectChecker } from '../../src/customObjectChecker';
import { ObjectRedactor } from '../../src/objectRedactor';
jest.mock('../../src/primitiveRedactor');
jest.mock('../../src/secretManager');
jest.mock('../../src/customObjectChecker');
jest.mock('../../src/objectRedactor');

describe('FieldRedactor', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('constructor', () => {
    it('Should create the PrimitiveRedactor with the correct configuration', () => {
      const config = {
        ignoreBooleans: true,
        ignoreDates: [moment.ISO_8601],
        ignoreNullOrUndefined: true,
        redactor: () => Promise.resolve('foobar')
      };

      new FieldRedactor(config);
      expect(PrimitiveRedactor).toHaveBeenCalledTimes(1);
      expect(PrimitiveRedactor).toHaveBeenCalledWith(config);
    });

    it('Should create the SecretManager with the correct configuration', () => {
      const config = {
        secretKeys: [/password/],
        deepSecretKeys: [/token/],
        fullSecretKeys: [/key/]
      };

      new FieldRedactor(config);
      expect(SecretManager).toHaveBeenCalledTimes(1);
      expect(SecretManager).toHaveBeenCalledWith(config);
    });

    it('Should create the CustomObjectChecker with the correct configuration', () => {
      const config = {
        customObjects: []
      };

      new FieldRedactor(config);
      expect(CustomObjectChecker).toHaveBeenCalledTimes(1);
      expect(CustomObjectChecker).toHaveBeenCalledWith(config.customObjects);
    });

    it('Should create the ObjectRedactor with the dependency-injected inputs', () => {
      const config = {};
      new FieldRedactor(config);
      expect(ObjectRedactor).toHaveBeenCalledTimes(1);
      const mockPrimitiveRedactor = (PrimitiveRedactor as any).mock.instances[0];
      const mockSecretManager = (SecretManager as any).mock.instances[0];
      const mockCustomObjectChecker = (CustomObjectChecker as any).mock.instances[0];
      const arg = (ObjectRedactor as any).mock.calls[0];
      expect(arg[0]).toEqual(mockPrimitiveRedactor);
      expect(arg[1]).toEqual(mockSecretManager);
      expect(arg[2]).toEqual(mockCustomObjectChecker);
    });
  });

  describe('redact', () => {
    it('Should throw an exception on invalid input', async () => {
      const fieldRedactor = new FieldRedactor();
      expect(() => fieldRedactor.redact(null)).rejects.toThrow('Input value must be a JSON object');
      expect(() => fieldRedactor.redact(undefined)).rejects.toThrow('Input value must be a JSON object');
      expect(() => fieldRedactor.redact('foo')).rejects.toThrow('Input value must be a JSON object');
      expect(() => fieldRedactor.redact(1)).rejects.toThrow('Input value must be a JSON object');
      expect(() => fieldRedactor.redact(false)).rejects.toThrow('Input value must be a JSON object');
      expect(() => fieldRedactor.redact(true)).rejects.toThrow('Input value must be a JSON object');
      expect(() => fieldRedactor.redact(new Date())).rejects.toThrow('Input value must be a JSON object');
      expect(() => fieldRedactor.redact(() => {})).rejects.toThrow('Input value must be a JSON object');
    });

    it('Should call objectRedactor redactInPlace with a copy of the input', async () => {
      const fieldRedactor = new FieldRedactor();
      const input = { foo: 'bar' };
      await fieldRedactor.redact(input);
      const mockObjectRedactor = (ObjectRedactor as any).mock.instances[0];
      const argument = mockObjectRedactor.redactInPlace.mock.calls[0][0];
      expect(argument).not.toBe(input);
      expect(argument).toEqual(input);
    });
  });

  describe('redactInPlace', () => {
    it('Should throw an exception on invalid input', async () => {
      const fieldRedactor = new FieldRedactor();
      expect(() => fieldRedactor.redactInPlace(null)).rejects.toThrow('Input value must be a JSON object');
      expect(() => fieldRedactor.redactInPlace(undefined)).rejects.toThrow('Input value must be a JSON object');
      expect(() => fieldRedactor.redactInPlace('foo')).rejects.toThrow('Input value must be a JSON object');
      expect(() => fieldRedactor.redactInPlace(1)).rejects.toThrow('Input value must be a JSON object');
      expect(() => fieldRedactor.redactInPlace(false)).rejects.toThrow('Input value must be a JSON object');
      expect(() => fieldRedactor.redactInPlace(true)).rejects.toThrow('Input value must be a JSON object');
      expect(() => fieldRedactor.redactInPlace(new Date())).rejects.toThrow('Input value must be a JSON object');
      expect(() => fieldRedactor.redactInPlace(() => {})).rejects.toThrow('Input value must be a JSON object');
    });

    it('Should call objectRedactor redactInPlace with a copy of the input', async () => {
      const fieldRedactor = new FieldRedactor();
      const input = { foo: 'bar' };
      await fieldRedactor.redactInPlace(input);
      const mockObjectRedactor = (ObjectRedactor as any).mock.instances[0];
      const argument = mockObjectRedactor.redactInPlace.mock.calls[0][0];
      expect(argument).toBe(input);
    });
  });
});
