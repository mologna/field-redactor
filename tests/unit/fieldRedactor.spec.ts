import * as crypto from 'crypto';
import { FieldRedactor } from '../../src/fieldRedactor';
import { SecretManager } from '../../src/secretManager';
import {
  validInputIncludingNullAndUndefined,
  validInputWithAllTypes,
  validNestedInputWithAllTypes
} from '../mocks/inputMocks';
import { Redactor } from '../../src/redactor';

describe('NewFieldRedactor', () => {
  const DEFAULT_REDACTED_TEXT: string = 'REDACTED';

  const validateRedactorOutput = (
    input: any,
    output: any,
    redactedText: string,
    redactNullOrUndefined?: boolean,
    secretKeys?: RegExp[]
  ) => {
    const manager = new SecretManager(secretKeys);
    for (const key of Object.keys(output)) {
      if (typeof output[key] === 'object' && !!output[key]) {
        validateRedactorOutput(input[key], output[key], redactedText);
      } else if (!secretKeys || (secretKeys && manager.isSecretKey(key))) {
        if ((output[key] === null || output[key] === undefined) && !redactNullOrUndefined) {
          expect(output[key]).toBe(input[key]);
        } else {
          expect(output[key]).toBe(redactedText);
        }
      } else {
        expect(output[key]).toBe(input[key]);
      }
    }
  };

  it('Should throw an exception when given a value thats not a JSON object', async () => {
    const inputError: string = 'Input value must be a JSON object';
    const redactor: FieldRedactor = new FieldRedactor();
    await expect(() => redactor.redact(null)).rejects.toThrow(inputError);
    await expect(async () => redactor.redact(undefined)).rejects.toThrow(inputError);
    await expect(async () => redactor.redact(new Date())).rejects.toThrow(inputError);
    await expect(async () => redactor.redact(1)).rejects.toThrow(inputError);
    await expect(async () => redactor.redact('foobar')).rejects.toThrow(inputError);
    await expect(async () => redactor.redact(() => {})).rejects.toThrow(inputError);
  });

  it('Should return a redacted copy of the input JSON for all value types', async () => {
    const redactor: FieldRedactor = new FieldRedactor();
    const redacted = await redactor.redact(validInputWithAllTypes);
    console.log(redacted);
    expect(redacted).not.toBe(validInputWithAllTypes);
    validateRedactorOutput(validInputWithAllTypes, redacted, DEFAULT_REDACTED_TEXT);
  });

  it('Ignores boolean values when specified', async () => {
    const redactor: FieldRedactor = new FieldRedactor({ ignoreBooleans: true });
    const redacted = await redactor.redact({ foo: true, bar: 'bar' });
    expect(redacted.foo).toBe(true);
    expect(redacted.bar).toBe(DEFAULT_REDACTED_TEXT);
  });

  it('Ignores date values when specified', async () => {
    const redactor: FieldRedactor = new FieldRedactor({ ignoreDates: true });
    const date = new Date();
    const redacted = await redactor.redact({ foo: date, bar: 'bar' });
    expect(redacted.foo).toStrictEqual(date);
    expect(redacted.bar).toBe(DEFAULT_REDACTED_TEXT);
  });

  it('Should be able to handle nested JSON objects of various types, sizes, and lengths', async () => {
    const redactor: FieldRedactor = new FieldRedactor();
    const redacted = await redactor.redact(validNestedInputWithAllTypes);
    expect(redacted).not.toBe(validNestedInputWithAllTypes);
    validateRedactorOutput(validNestedInputWithAllTypes, redacted, DEFAULT_REDACTED_TEXT);
  });

  it('Does not redact null or undefined by default', async () => {
    const redactor: FieldRedactor = new FieldRedactor();
    const redacted = await redactor.redact(validInputIncludingNullAndUndefined);
    expect(redacted).not.toBe(validInputIncludingNullAndUndefined);
    validateRedactorOutput(validInputIncludingNullAndUndefined, redacted, DEFAULT_REDACTED_TEXT, false);
  });

  it('Can redact null or undefined when specified', async () => {
    const redactor: FieldRedactor = new FieldRedactor({
      redactNullOrUndefined: true
    });
    const redacted = await redactor.redact(validInputIncludingNullAndUndefined);
    expect(redacted).not.toBe(validInputIncludingNullAndUndefined);
    validateRedactorOutput(validInputWithAllTypes, redacted, DEFAULT_REDACTED_TEXT, true);
  });

  it('Can use custom redaction text', async () => {
    const replacementText: string = 'foobar';
    const redactor: FieldRedactor = new FieldRedactor({ replacementText });
    const redacted = await redactor.redact(validInputWithAllTypes);
    expect(redacted).not.toBe(validInputWithAllTypes);
    validateRedactorOutput(validInputWithAllTypes, redacted, replacementText);
  });

  it('Can redact all common values in an array', async () => {
    const testArray = ['foo', new Date(), 12, 123.45, true];

    const input = { testArray };
    const redactor: FieldRedactor = new FieldRedactor();
    const result = await redactor.redact(input);
    result.testArray.forEach((value: any) => {
      expect(value).toBe(DEFAULT_REDACTED_TEXT);
    });
  });

  it('Skips nulls and undefined when included in an array', async () => {
    const testArray = [null, undefined];

    const input = { testArray };
    const redactor: FieldRedactor = new FieldRedactor();
    const result = await redactor.redact(input);
    result.testArray.forEach((value: any, index: number) => {
      expect(value).toBe(testArray[index]);
    });
  });

  it('Can handle objects nested in arrays', async () => {
    const testArray = [
      {
        foo: 'bar',
        password: 'password'
      }
    ];

    const input = { testArray };
    const redactor: FieldRedactor = new FieldRedactor();
    const result = await redactor.redact(input);
    expect(result.testArray[0].foo).toBe(DEFAULT_REDACTED_TEXT);
    expect(result.testArray[0].password).toBe(DEFAULT_REDACTED_TEXT);
  });

  it('Can handle arrays nested more than one deep in objects', async () => {
    const testObject = {
      foo: ['a', 'b', 'c']
    };

    const input = { testObject };
    const redactor: FieldRedactor = new FieldRedactor();
    const result = await redactor.redact(input);
    expect(result.testObject.foo.length).toBe(3);
    result.testObject.foo.forEach((value: any) => {
      expect(value).toBe(DEFAULT_REDACTED_TEXT);
    });
  });

  it('Can handle complex nesting structures of arrays and objects', async () => {
    const testObject = {
      foo: [
        {
          bar: 'baz',
          password: 'password'
        },
        {
          bar: 'baz',
          password: 'password'
        },
        'fizz'
      ],
      bar: 'buzz'
    };

    const input = { testObject };
    const redactor: FieldRedactor = new FieldRedactor();
    const result = await redactor.redact(input);
    expect(result.testObject.foo.length).toBe(testObject.foo.length);
    expect(result.testObject.foo[0].bar).toBe(DEFAULT_REDACTED_TEXT);
    expect(result.testObject.foo[0].password).toBe(DEFAULT_REDACTED_TEXT);
    expect(result.testObject.foo[1].bar).toBe(DEFAULT_REDACTED_TEXT);
    expect(result.testObject.foo[1].password).toBe(DEFAULT_REDACTED_TEXT);
    expect(result.testObject.foo[2]).toBe(DEFAULT_REDACTED_TEXT);
    expect(result.testObject.bar).toBe(DEFAULT_REDACTED_TEXT);
  });

  it('Can redact only specific keys', async () => {
    const secretKeys: RegExp[] = [/userId/, /password/, /acctBalance/];
    const redactor: FieldRedactor = new FieldRedactor({
      secretKeys
    });
    const redacted = await redactor.redact(validInputWithAllTypes);
    expect(redacted).not.toBe(validInputWithAllTypes);
    validateRedactorOutput(validInputWithAllTypes, redacted, DEFAULT_REDACTED_TEXT, false, secretKeys);
  });

  it('Redacts all values under a deeply nested key when specified', async () => {
    const secretKeys: RegExp[] = [/password/, /acctBalance/, /parentAccount/];
    const deepSecretKeys: RegExp[] = [/parentAccount/];
    const redactor: FieldRedactor = new FieldRedactor({
      secretKeys,
      deepSecretKeys
    });
    const simpleNestedInputWithDeepSecret = {
      password: 'password123',
      username: 'child',
      foo: 'bar',
      parentAccount: {
        foo: 'bar',
        biz: 'baz',
        fizz: {
          buzz: 'fizzbuzz'
        }
      }
    };
    const redacted = await redactor.redact(simpleNestedInputWithDeepSecret);

    expect(redacted).not.toBe(simpleNestedInputWithDeepSecret);
    expect(redacted.password).toBe(DEFAULT_REDACTED_TEXT);
    expect(redacted.username).toBe(simpleNestedInputWithDeepSecret.username);
    expect(redacted.parentAccount.foo).toBe(DEFAULT_REDACTED_TEXT);
    expect(redacted.parentAccount.biz).toBe(DEFAULT_REDACTED_TEXT);
    expect(redacted.parentAccount.fizz.buzz).toBe(DEFAULT_REDACTED_TEXT);
  });

  it('Allows user to specify their own redactor', async () => {
    const foo = 'foo';
    const hashedFoo = 'acbd18db4cc2f85cedef654fccc4a4d8';
    const customRedactor: Redactor = (value: any) => {
      return Promise.resolve(crypto.createHash('md5').update(value).digest('hex'));
    };
    const simpleObject = {
      foo
    };

    const redactor: FieldRedactor = new FieldRedactor({
      redactor: customRedactor
    });

    const result = await redactor.redact(simpleObject);
    expect(result.foo).toBe(hashedFoo);
  });

  it('Can redact special objects', async () => {
    const specialObjects = [
      {
        foo: true,
        bar: false
      }
    ];

    const input = {
      mySpecial: {
        foo: 'foo',
        bar: 'bar'
      }
    };

    const redactor: FieldRedactor = new FieldRedactor({
      customObjects: specialObjects
    });

    const result = await redactor.redact(input);
    expect(result.mySpecial.foo).toBe(DEFAULT_REDACTED_TEXT);
    expect(result.mySpecial.bar).toBe(input.mySpecial.bar);
  });

  it('Can handle top-level special objects', async () => {
    const specialObjects = [
      {
        foo: true,
        bar: false
      }
    ];

    const input = {
      foo: 'foo',
      bar: 'bar'
    };

    const redactor: FieldRedactor = new FieldRedactor({
      customObjects: specialObjects
    });

    const result = await redactor.redact(input);
    expect(result.foo).toBe(DEFAULT_REDACTED_TEXT);
    expect(result.bar).toBe(input.bar);
  });

  it('Can handle special objects in arrays', async () => {
    const specialObjects = [
      {
        foo: true,
        bar: false
      }
    ];

    const input = {
      me: [
        {
          foo: 'foo',
          bar: 'bar'
        },
        {
          foo: 'foo',
          bar: 'bar'
        }
      ]
    };

    const redactor: FieldRedactor = new FieldRedactor({
      customObjects: specialObjects
    });

    const result = await redactor.redact(input);
    result.me.forEach((value: any, index: number) => {
      expect(value.foo).toBe(DEFAULT_REDACTED_TEXT);
      expect(value.bar).toBe(input.me[index].bar);
    });
  });
});
