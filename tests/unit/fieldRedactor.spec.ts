import { FieldRedactor } from '../../src/fieldRedactor';
import { PrimitiveRedactor } from '../../src/primitiveRedactor';
import { SecretManager } from '../../src/secretManager';
import { CustomObjectManager } from '../../src/customObjectManager';
import { ObjectRedactor } from '../../src/objectRedactor';
import { FieldRedactorError } from '../../src/errors';
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

    it('Should default ignoreBooleans to false and ignoreNullOrUndefined to true', () => {
      new FieldRedactor();
      expect(PrimitiveRedactor).toHaveBeenCalledTimes(1);
      expect(PrimitiveRedactor).toHaveBeenCalledWith({
        ignoreBooleans: false,
        ignoreNullOrUndefined: true,
        redactor: undefined
      });
    });

    it('Should create the SecretManager with the correct configuration', () => {
      const config = {
        secretKeys: [/password/],
        deepSecretKeys: [/token/],
        fullSecretKeys: [/key/],
        deleteSecretKeys: [/delete/]
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

    it('Should return undefined, null, Date, or non-primitive input as-is', async () => {
      const func = () => {};
      const date = new Date();
      const fieldRedactor = new FieldRedactor();
      expect(await fieldRedactor.redact(undefined)).toBe(undefined);
      expect(await fieldRedactor.redact(null)).toBe(null);
      expect(await fieldRedactor.redact(1)).toBe(1);
      expect(await fieldRedactor.redact(true)).toBe(true);
      expect(await fieldRedactor.redact(false)).toBe(false);
      expect(await fieldRedactor.redact(date)).toEqual(date);
      expect(await fieldRedactor.redact(func)).toBe(func);
      expect(await fieldRedactor.redact('foo')).toBe('foo');
    });

    it('Should wrap any thrown exceptions in a FieldRedactorError', async () => {
      const errorText = 'foobar';
      const fieldRedactor = new FieldRedactor();
      const mockObjectRedactor = (ObjectRedactor as any).mock.instances[0];
      mockObjectRedactor.redactInPlace.mockImplementation(async () => {
        throw new Error(errorText);
      });
      expect(() => fieldRedactor.redactInPlace({ foo: 'bar' })).rejects.toThrow(new FieldRedactorError(errorText));
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

    it('Should leave primitive, undefined, date, or function input unchanged', async () => {
      const func = () => {};
      const date = new Date();
      const nullValue = null;
      const undefinedValue = undefined;
      const num = 1;
      const boolTrue = true;
      const boolFalse = false;
      const str = 'foo';
      const fieldRedactor = new FieldRedactor();

      await fieldRedactor.redactInPlace(undefinedValue);
      await fieldRedactor.redactInPlace(nullValue);
      await fieldRedactor.redactInPlace(num);
      await fieldRedactor.redactInPlace(boolTrue);
      await fieldRedactor.redactInPlace(boolFalse);
      await fieldRedactor.redactInPlace(date);
      await fieldRedactor.redactInPlace(func);
      await fieldRedactor.redactInPlace(str);

      expect(undefinedValue).toBe(undefined);
      expect(nullValue).toBe(null);
      expect(num).toBe(1);
      expect(boolTrue).toBe(true);
      expect(boolFalse).toBe(false);
      expect(date).toEqual(date);
      expect(func).toBe(func);
      expect(str).toBe('foo');
    });

    it('Should wrap any thrown exceptions in a FieldRedactorError', async () => {
      const errorText = 'foobar';
      const fieldRedactor = new FieldRedactor();
      const mockObjectRedactor = (ObjectRedactor as any).mock.instances[0];
      mockObjectRedactor.redactInPlace.mockImplementation(async () => {
        throw new Error(errorText);
      });
      expect(() => fieldRedactor.redactInPlace({ foo: 'bar' })).rejects.toThrow(new FieldRedactorError(errorText));
    });
  });
});
