import rfdc from 'rfdc';
import * as crypto from 'crypto';
import { SecretManager } from '../../src/secretManager';
import {
  validInputIncludingNullAndUndefined,
  validInputWithAllTypes,
  validNestedInputWithAllTypes
} from '../mocks/inputMocks';
import { CustomObject, Redactor } from '../../src/types';
import { ObjectRedactor } from '../../src/objectRedactor';

describe('ObjectRedactor', () => {
  const DEFAULT_REDACTED_TEXT: string = 'REDACTED';
  const deepCopy = rfdc({ proto: true, circles: true });

  const validateRedactorOutput = (
    input: any,
    output: any,
    redactedText: string,
    redactNullOrUndefined?: boolean,
    secretKeys?: RegExp[]
  ) => {
    const manager = new SecretManager({ secretKeys });
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

  it('Should return a redacted copy of the input JSON for all value types', async () => {
    const redactor: ObjectRedactor = new ObjectRedactor();
    const copy = deepCopy(validInputWithAllTypes)
    await redactor.redactInPlace(copy);
    expect(copy).not.toBe(validInputWithAllTypes);
    validateRedactorOutput(validInputWithAllTypes, copy, DEFAULT_REDACTED_TEXT);
  });

  it('Ignores boolean values when specified', async () => {
    const redactor: ObjectRedactor = new ObjectRedactor({ ignoreBooleans: true });
    const input = { foo: true, bar: 'bar' };
    await redactor.redactInPlace(input);
    expect(input.foo).toBe(true);
    expect(input.bar).toBe(DEFAULT_REDACTED_TEXT);
  });

  it('Ignores date values when specified', async () => {
    const redactor: ObjectRedactor = new ObjectRedactor({ ignoreDates: true });
    const date = new Date();
    const input = { foo: date, bar: 'bar' };
    await redactor.redactInPlace(input);
    expect(input.foo).toStrictEqual(date);
    expect(input.bar).toBe(DEFAULT_REDACTED_TEXT);
  });

  it('Should be able to handle nested JSON objects of various types, sizes, and lengths', async () => {
    const redactor: ObjectRedactor = new ObjectRedactor();
    const copy = deepCopy(validInputWithAllTypes)
    await redactor.redactInPlace(copy);
    expect(copy).not.toBe(validNestedInputWithAllTypes);
    validateRedactorOutput(validNestedInputWithAllTypes, copy, DEFAULT_REDACTED_TEXT);
  });

  it('Does not redact null or undefined by default', async () => {
    const redactor: ObjectRedactor = new ObjectRedactor();
    const copy = deepCopy(validInputIncludingNullAndUndefined);
    await redactor.redactInPlace(copy);
    expect(copy).not.toBe(validInputIncludingNullAndUndefined);
    validateRedactorOutput(validInputIncludingNullAndUndefined, copy, DEFAULT_REDACTED_TEXT, false);
  });

  it('Can redact null or undefined when specified', async () => {
    const redactor: ObjectRedactor = new ObjectRedactor({
      redactNullOrUndefined: true
    });
    const copy = deepCopy(validInputIncludingNullAndUndefined);
    await redactor.redactInPlace(copy);
    expect(copy).not.toBe(validInputIncludingNullAndUndefined);
    validateRedactorOutput(validInputWithAllTypes, copy, DEFAULT_REDACTED_TEXT, true);
  });

  it('Can use custom redaction text', async () => {
    const replacementText: string = 'foobar';
    const redactor: ObjectRedactor = new ObjectRedactor({ replacementText });
    const copy = deepCopy(validInputWithAllTypes);
    await redactor.redactInPlace(copy);
    expect(copy).not.toBe(validInputWithAllTypes);
    validateRedactorOutput(validInputWithAllTypes, copy, replacementText);
  });

  it('Can redact all common values in an array', async () => {
    const testArray = ['foo', new Date(), 12, 123.45, true];

    const input = { testArray };
    const redactor: ObjectRedactor = new ObjectRedactor();
    await redactor.redactInPlace(input);
    input.testArray.forEach((value: any) => {
      expect(value).toBe(DEFAULT_REDACTED_TEXT);
    });
  });

  it('Skips nulls and undefined when included in an array', async () => {
    const testArray = [null, undefined];

    const input = { testArray };
    const redactor: ObjectRedactor = new ObjectRedactor();
    await redactor.redactInPlace(input);
    input.testArray.forEach((value: any, index: number) => {
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
    const redactor: ObjectRedactor = new ObjectRedactor();
    const result = await redactor.redactInPlace(input);
    expect(result.testArray[0].foo).toBe(DEFAULT_REDACTED_TEXT);
    expect(result.testArray[0].password).toBe(DEFAULT_REDACTED_TEXT);
  });

  it('Can handle arrays nested more than one deep in objects', async () => {
    const testObject = {
      foo: ['a', 'b', 'c']
    };

    const input = { testObject };
    const redactor: ObjectRedactor = new ObjectRedactor();
    const result = await redactor.redactInPlace(input);
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
    const redactor: ObjectRedactor = new ObjectRedactor();
    const result = await redactor.redactInPlace(input);
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
    const redactor: ObjectRedactor = new ObjectRedactor({
      secretKeys
    });
    const copy = deepCopy(validInputWithAllTypes);
    await redactor.redactInPlace(copy);
    expect(copy).not.toBe(validInputWithAllTypes);
    validateRedactorOutput(validInputWithAllTypes, copy, DEFAULT_REDACTED_TEXT, false, secretKeys);
  });

  it('Redacts all values under a deeply nested key when specified', async () => {
    const secretKeys: RegExp[] = [/password/, /acctBalance/, /parentAccount/];
    const deepSecretKeys: RegExp[] = [/parentAccount/];
    const redactor: ObjectRedactor = new ObjectRedactor({
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
    const copy = deepCopy(simpleNestedInputWithDeepSecret);
    await redactor.redactInPlace(copy);

    expect(copy).not.toBe(simpleNestedInputWithDeepSecret);
    expect(copy.password).toBe(DEFAULT_REDACTED_TEXT);
    expect(copy.username).toBe(simpleNestedInputWithDeepSecret.username);
    expect(copy.parentAccount.foo).toBe(DEFAULT_REDACTED_TEXT);
    expect(copy.parentAccount.biz).toBe(DEFAULT_REDACTED_TEXT);
    expect(copy.parentAccount.fizz.buzz).toBe(DEFAULT_REDACTED_TEXT);
  });

  it('Can perform fullRedaction on objects and arrays when specified', async () => {
    const redactor: ObjectRedactor = new ObjectRedactor({
      fullSecretKeys: [/foo/, /bar/],
      secretKeys: []
    });

    const input = {
      foo: {
        bar: {
          fizz: 'buzz',
          bim: 'bam'
        },
        a: 'b'
      },
      bar: ['fizz', 'buzz'],
      bim: 'bam'
    };

    const redacted = await redactor.redactInPlace(input);
    expect(redacted.foo).toBe(DEFAULT_REDACTED_TEXT);
    expect(redacted.bar).toBe(DEFAULT_REDACTED_TEXT);
    expect(redacted.bim).toBe('bam');
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

    const redactor: ObjectRedactor = new ObjectRedactor({
      redactor: customRedactor
    });

    const result = await redactor.redactInPlace(simpleObject);
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

    const redactor: ObjectRedactor = new ObjectRedactor({
      customObjects: specialObjects
    });

    const result = await redactor.redactInPlace(input);
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

    const redactor: ObjectRedactor = new ObjectRedactor({
      customObjects: specialObjects
    });

    const result = await redactor.redactInPlace(input);
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

    const redactor: ObjectRedactor = new ObjectRedactor({
      customObjects: specialObjects
    });

    const result = await redactor.redactInPlace(input);
    result.me.forEach((value: any, index: number) => {
      expect(value.foo).toBe(DEFAULT_REDACTED_TEXT);
      expect(value.bar).toBe(input.me[index].bar);
    });
  });

  it('Does not redact null, or undefined special object values by default', async () => {
    const specialObject: CustomObject = {
      foo: true,
      bar: true
    };
    const redactor: ObjectRedactor = new ObjectRedactor({
      customObjects: [specialObject],
      secretKeys: [],
      redactNullOrUndefined: false
    });
    const obj = { foo: null, bar: undefined };
    await redactor.redactInPlace(obj);
    expect(obj).toEqual({ foo: null, bar: undefined });
  });
      
  it('Can redact null, or undefined special object values if specified', async () => {
    const specialObject: CustomObject = {
      foo: true,
      bar: true
    };
    const redactor: ObjectRedactor = new ObjectRedactor({
      customObjects: [specialObject],
      redactNullOrUndefined: true
    });
    const obj = { foo: null, bar: undefined };
    await redactor.redactInPlace(obj);
    expect(obj).toEqual({ foo: DEFAULT_REDACTED_TEXT, bar: DEFAULT_REDACTED_TEXT });
  });


  it('Uses the secretManager to determine if a string-specified value is a secret key', async () => {
    const specialObject: CustomObject = {
      name: false,
      kind: false,
      value: 'name'
    };

    const redactor: ObjectRedactor = new ObjectRedactor({
      customObjects: [specialObject],
      secretKeys: [/email/]
    });
    const obj = { name: 'email', kind: 'String', value: 'foo.bar@gmail.com' };
    await redactor.redactInPlace(obj);
    expect(obj).toEqual({
      name: 'email',
      kind: 'String',
      value: DEFAULT_REDACTED_TEXT
    });
  });

  it('Uses the secretManager to determine if a string-specified value is a secret key and can handle arrays', async () => {
    const specialObject: CustomObject = {
      name: false,
      kind: false,
      value: 'name'
    };

    const redactor: ObjectRedactor = new ObjectRedactor({
      customObjects: [specialObject],
      secretKeys: [/email/]
    });
    const obj = { name: 'email', kind: 'String', value: ["foo", "bar"] };
    await redactor.redactInPlace(obj);
    expect(obj).toEqual({
      name: 'email',
      kind: 'String',
      value: [DEFAULT_REDACTED_TEXT, DEFAULT_REDACTED_TEXT]
    });
  });

  it('Does not redact a value if the string-specified field does not contain a secret key', async () => {
    const specialObject: CustomObject = {
      name: false,
      kind: false,
      value: 'name'
    };

    const redactor: ObjectRedactor = new ObjectRedactor({
      customObjects: [specialObject],
      secretKeys: [/email/]
    });
    const obj = {
      name: 'notredacted',
      kind: 'String',
      value: 'foo.bar@gmail.com'
    };
    await redactor.redactInPlace(obj);
    expect(obj).toEqual({
      name: 'notredacted',
      kind: 'String',
      value: 'foo.bar@gmail.com'
    });
  });

  it('Does not redact a value or fail if the string-specified field does not exist', async () => {
    const specialObject: CustomObject = {
      name: false,
      kind: false,
      value: 'foobar'
    };

    const redactor: ObjectRedactor = new ObjectRedactor({
      customObjects: [specialObject],
      secretKeys: [/email/]
    });
    const obj = { name: 'email', kind: 'String', value: 'foo.bar@gmail.com' };
    await redactor.redactInPlace(obj);
    expect(obj).toEqual({
      name: 'email',
      kind: 'String',
      value: 'foo.bar@gmail.com'
    });
  });
});
