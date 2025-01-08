import { FieldRedactor } from '../../src/fieldRedactor';
import { PrimitiveRedactor } from '../../src/primitiveRedactor';
import { SecretManager } from '../../src/secretManager';
import { CustomObjectManager } from '../../src/customObjectManager';
import { ObjectRedactor } from '../../src/objectRedactor';
import { FieldRedactorValidationError } from '../../src/errors';
jest.mock('../../src/primitiveRedactor');
jest.mock('../../src/secretManager');
jest.mock('../../src/customObjectManager');
jest.mock('../../src/objectRedactor');

describe('FieldRedactor', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('constructor', () => {
    it('Should create the PrimitiveRedactor with the correct configuration', () => {
      const config = {
        ignoreBooleans: true,
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

    it('Should create the CustomObjectManager with the correct configuration', () => {
      const config = {
        customObjects: []
      };

      new FieldRedactor(config);
      expect(CustomObjectManager).toHaveBeenCalledTimes(1);
      expect(CustomObjectManager).toHaveBeenCalledWith(config.customObjects);
    });

    it('Should create the ObjectRedactor with the correct dependency-injected inputs', () => {
      const config = {};
      new FieldRedactor(config);
      expect(ObjectRedactor).toHaveBeenCalledTimes(1);
      const mockPrimitiveRedactor = (PrimitiveRedactor as any).mock.instances[0];
      const mockSecretManager = (SecretManager as any).mock.instances[0];
      const mockCustomObjectManager = (CustomObjectManager as any).mock.instances[0];
      const arg = (ObjectRedactor as any).mock.calls[0];
      expect(arg[0]).toEqual(mockPrimitiveRedactor);
      expect(arg[1]).toEqual(mockSecretManager);
      expect(arg[2]).toEqual(mockCustomObjectManager);
    });
  });

  describe('redact', () => {
    it('Should call objectRedactor redactInPlace with a copy of the input', async () => {
      const fieldRedactor = new FieldRedactor();
      const input = { foo: 'bar' };
      await fieldRedactor.redact(input);
      const mockObjectRedactor = (ObjectRedactor as any).mock.instances[0];
      const argument = mockObjectRedactor.redactInPlace.mock.calls[0][0];
      expect(argument).not.toBe(input);
      expect(argument).toEqual(input);
    });

    it('Should throw an exception on invalid input', async () => {
      const fieldRedactor = new FieldRedactor();
      expect(() => fieldRedactor.redact(null)).rejects.toThrow(
        new FieldRedactorValidationError('Input value must be a JSON object')
      );
      expect(() => fieldRedactor.redact(undefined)).rejects.toThrow(
        new FieldRedactorValidationError('Input value must be a JSON object')
      );
      expect(() => fieldRedactor.redact('foo')).rejects.toThrow(
        new FieldRedactorValidationError('Input value must be a JSON object')
      );
      expect(() => fieldRedactor.redact(1)).rejects.toThrow(
        new FieldRedactorValidationError('Input value must be a JSON object')
      );
      expect(() => fieldRedactor.redact(false)).rejects.toThrow(
        new FieldRedactorValidationError('Input value must be a JSON object')
      );
      expect(() => fieldRedactor.redact(true)).rejects.toThrow(
        new FieldRedactorValidationError('Input value must be a JSON object')
      );
      expect(() => fieldRedactor.redact(new Date())).rejects.toThrow(
        new FieldRedactorValidationError('Input value must be a JSON object')
      );
      expect(() => fieldRedactor.redact(() => {})).rejects.toThrow(
        new FieldRedactorValidationError('Input value must be a JSON object')
      );
    });

    it('Should wrap any thrown exceptions in a FieldRedactorError', async () => {
      const errorText = 'foobar';
      const fieldRedactor = new FieldRedactor();
      const mockObjectRedactor = (ObjectRedactor as any).mock.instances[0];
      mockObjectRedactor.redactInPlace.mockImplementation(async () => {
        throw new Error(errorText);
      });
      expect(() => fieldRedactor.redactInPlace({ foo: 'bar' })).rejects.toThrow(
        new FieldRedactorValidationError(errorText)
      );
    });
  });

  describe('redactInPlace', () => {
    it('Should call objectRedactor redactInPlace with a copy of the input', async () => {
      const fieldRedactor = new FieldRedactor();
      const input = { foo: 'bar' };
      await fieldRedactor.redactInPlace(input);
      const mockObjectRedactor = (ObjectRedactor as any).mock.instances[0];
      const argument = mockObjectRedactor.redactInPlace.mock.calls[0][0];
      expect(argument).toBe(input);
    });

    it('Should throw an exception on invalid input', async () => {
      const fieldRedactor = new FieldRedactor();
      expect(() => fieldRedactor.redactInPlace(null)).rejects.toThrow(
        new FieldRedactorValidationError('Input value must be a JSON object')
      );
      expect(() => fieldRedactor.redactInPlace(undefined)).rejects.toThrow(
        new FieldRedactorValidationError('Input value must be a JSON object')
      );
      expect(() => fieldRedactor.redactInPlace('foo')).rejects.toThrow(
        new FieldRedactorValidationError('Input value must be a JSON object')
      );
      expect(() => fieldRedactor.redactInPlace(1)).rejects.toThrow(
        new FieldRedactorValidationError('Input value must be a JSON object')
      );
      expect(() => fieldRedactor.redactInPlace(false)).rejects.toThrow(
        new FieldRedactorValidationError('Input value must be a JSON object')
      );
      expect(() => fieldRedactor.redactInPlace(true)).rejects.toThrow(
        new FieldRedactorValidationError('Input value must be a JSON object')
      );
      expect(() => fieldRedactor.redactInPlace(new Date())).rejects.toThrow(
        new FieldRedactorValidationError('Input value must be a JSON object')
      );
      expect(() => fieldRedactor.redactInPlace(() => {})).rejects.toThrow(
        new FieldRedactorValidationError('Input value must be a JSON object')
      );
    });

    it('Should wrap any thrown exceptions in a FieldRedactorError', async () => {
      const errorText = 'foobar';
      const fieldRedactor = new FieldRedactor();
      const mockObjectRedactor = (ObjectRedactor as any).mock.instances[0];
      mockObjectRedactor.redactInPlace.mockImplementation(async () => {
        throw new Error(errorText);
      });
      expect(() => fieldRedactor.redactInPlace({ foo: 'bar' })).rejects.toThrow(
        new FieldRedactorValidationError(errorText)
      );
    });
  });
});
