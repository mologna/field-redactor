import rfdc from 'rfdc';
import * as crypto from 'crypto';
import { SecretManager } from '../../src/secretManager';
import { validInputWithAllTypes, validNestedInputWithAllTypes } from '../mocks/inputMocks';
import { CustomObject, CustomObjectMatchType, Redactor } from '../../src/types';
import { ObjectRedactor } from '../../src/objectRedactor';
import { PrimitiveRedactor } from '../../src/primitiveRedactor';
import { CustomObjectChecker } from '../../src/customObjectChecker';

describe('ObjectRedactor', () => {
  const DEFAULT_REDACTED_TEXT: string = 'REDACTED';
  const deepCopy = rfdc({ proto: true, circles: true });
  let primitiveRedactor: PrimitiveRedactor;
  let secretManager: SecretManager;
  let customObjectChecker: CustomObjectChecker;
  let basicObjectRedactor: ObjectRedactor;

  const validateRedactorOutput = (
    input: any,
    output: any,
    redactedText: string,
    ignoreNullOrUndefined?: boolean,
    secretKeys?: RegExp[]
  ) => {
    const manager = new SecretManager({ secretKeys });
    for (const key of Object.keys(output)) {
      if (typeof output[key] === 'object' && !!output[key]) {
        validateRedactorOutput(input[key], output[key], redactedText);
      } else if (!secretKeys || (secretKeys && manager.isSecretKey(key))) {
        if ((output[key] === null || output[key] === undefined) && ignoreNullOrUndefined) {
          expect(output[key]).toBe(input[key]);
        } else {
          expect(output[key]).toBe(redactedText);
        }
      } else {
        expect(output[key]).toBe(input[key]);
      }
    }
  };

  beforeEach(() => {
    primitiveRedactor = new PrimitiveRedactor({});
    secretManager = new SecretManager({});
    customObjectChecker = new CustomObjectChecker();
    basicObjectRedactor = new ObjectRedactor(primitiveRedactor, secretManager, customObjectChecker);
  });

  it('Should return a redacted copy of the input JSON for all value types', async () => {
    const copy = deepCopy(validInputWithAllTypes);
    await basicObjectRedactor.redactInPlace(copy);
    expect(copy).not.toBe(validInputWithAllTypes);
    validateRedactorOutput(validInputWithAllTypes, copy, DEFAULT_REDACTED_TEXT);
  });

  it('Should be able to handle nested JSON objects of various types, sizes, and lengths', async () => {
    const copy = deepCopy(validInputWithAllTypes);
    await basicObjectRedactor.redactInPlace(copy);
    expect(copy).not.toBe(validNestedInputWithAllTypes);
    validateRedactorOutput(validNestedInputWithAllTypes, copy, DEFAULT_REDACTED_TEXT);
  });

  it('Can redact all common values in an array', async () => {
    const testArray = ['foo', new Date(), 12, 123.45, true];

    const input = { testArray };
    await basicObjectRedactor.redactInPlace(input);
    input.testArray.forEach((value: any) => {
      expect(value).toBe(DEFAULT_REDACTED_TEXT);
    });
  });

  it('Skips nulls and undefined when included in an array', async () => {
    const testArray = [null, undefined];
    const input = { testArray };
    await basicObjectRedactor.redactInPlace(input);
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
    const result = await basicObjectRedactor.redactInPlace(input);
    expect(result.testArray[0].foo).toBe(DEFAULT_REDACTED_TEXT);
    expect(result.testArray[0].password).toBe(DEFAULT_REDACTED_TEXT);
  });

  it('Can handle arrays nested more than one deep in objects', async () => {
    const testObject = {
      foo: ['a', 'b', 'c']
    };

    const input = { testObject };
    const result = await basicObjectRedactor.redactInPlace(input);
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
    const result = await basicObjectRedactor.redactInPlace(input);
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
    secretManager = new SecretManager({ secretKeys });
    const redactor: ObjectRedactor = new ObjectRedactor(primitiveRedactor, secretManager, customObjectChecker);
    const copy = deepCopy(validInputWithAllTypes);
    await redactor.redactInPlace(copy);
    expect(copy).not.toBe(validInputWithAllTypes);
    validateRedactorOutput(validInputWithAllTypes, copy, DEFAULT_REDACTED_TEXT, false, secretKeys);
  });

  it('Redacts all values under a deeply nested key when specified', async () => {
    const secretKeys: RegExp[] = [/password/, /acctBalance/, /parentAccount/];
    const deepSecretKeys: RegExp[] = [/parentAccount/];
    secretManager = new SecretManager({ secretKeys, deepSecretKeys });
    const redactor: ObjectRedactor = new ObjectRedactor(primitiveRedactor, secretManager, customObjectChecker);
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
    secretManager = new SecretManager({ fullSecretKeys: [/foo/, /bar/], secretKeys: [] });
    const redactor: ObjectRedactor = new ObjectRedactor(primitiveRedactor, secretManager, customObjectChecker);

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
    const primitiveRedactor = new PrimitiveRedactor({ redactor: customRedactor });
    const simpleObject = {
      foo
    };

    const redactor: ObjectRedactor = new ObjectRedactor(primitiveRedactor, secretManager, customObjectChecker);

    const result = await redactor.redactInPlace(simpleObject);
    expect(result.foo).toBe(hashedFoo);
  });

  it('Can perform deep redaction of nested arrays', async () => {
    const secretKeys: RegExp[] = [];
    const deepSecretKeys: RegExp[] = [/emails/];
    secretManager = new SecretManager({ secretKeys, deepSecretKeys });
    const redactor: ObjectRedactor = new ObjectRedactor(primitiveRedactor, secretManager, customObjectChecker);
    const input = {
      emails: ['foo.bar@example.com', ['nested', 'array']]
    };
    await redactor.redactInPlace(input);
    expect(input.emails[0]).toBe(DEFAULT_REDACTED_TEXT);
    expect(input.emails[1][0]).toBe(DEFAULT_REDACTED_TEXT);
    expect(input.emails[1][1]).toBe(DEFAULT_REDACTED_TEXT);
  });

  it('Can handle CustomObjectMatchTypes correctly', async () => {
    const customObject: CustomObject = {
      full: CustomObjectMatchType.Full,
      deep: CustomObjectMatchType.Deep,
      shallow: CustomObjectMatchType.Shallow,
      pass: CustomObjectMatchType.Pass,
      ignore: CustomObjectMatchType.Ignore
    };

    customObjectChecker = new CustomObjectChecker([customObject]);
    secretManager = new SecretManager({ secretKeys: [/fizz/, /fazz/] });
    const redactor: ObjectRedactor = new ObjectRedactor(primitiveRedactor, secretManager, customObjectChecker);
    const nestedObject = {
      bim: 'bam',
      biff: ['buzz', { bam: 'bar' }]
    };
    const obj = {
      full: {
        bim: 'bam',
        biff: ['buzz', { bam: 'bar' }]
      },
      deep: {
        bim: 'bam',
        biff: ['buzz', { bam: 'bar' }]
      },
      shallow: {
        bim: 'bam',
        fizz: 'buzz',
        fazz: ['buzz', { bam: 'bar' }]
      },
      pass: {
        bam: 'bam',
        fizz: 'buzz'
      },
      ignore: {
        bam: 'bam',
        fizz: 'buzz'
      }
    };

    await redactor.redactInPlace(obj);
    expect(obj.full).toEqual(DEFAULT_REDACTED_TEXT);
    expect(obj.deep).toEqual({
      bim: DEFAULT_REDACTED_TEXT,
      biff: [DEFAULT_REDACTED_TEXT, { bam: DEFAULT_REDACTED_TEXT }]
    });
    expect(obj.shallow).toEqual({
      bim: 'bam',
      fizz: DEFAULT_REDACTED_TEXT,
      fazz: [DEFAULT_REDACTED_TEXT, { bam: 'bar' }]
    });
    expect(obj.pass).toEqual({ bam: 'bam', fizz: DEFAULT_REDACTED_TEXT });
    expect(obj.ignore).toEqual({ bam: 'bam', fizz: 'buzz' });
  });

  it('Can handle CustomObjectMatchTypes correctly when value is an array', async () => {
    const customObject: CustomObject = {
      full: CustomObjectMatchType.Full,
      deep: CustomObjectMatchType.Deep,
      shallow: CustomObjectMatchType.Shallow,
      pass: CustomObjectMatchType.Pass,
      ignore: CustomObjectMatchType.Ignore
    };

    customObjectChecker = new CustomObjectChecker([customObject]);
    secretManager = new SecretManager({ secretKeys: [/fizz/] });
    const redactor: ObjectRedactor = new ObjectRedactor(primitiveRedactor, secretManager, customObjectChecker);
    const obj = {
      full: ['foo', { foo: 'bar', fizz: 'buzz' }],
      deep: ['foo', { foo: 'bar', fizz: 'buzz' }],
      shallow: ['foo', { foo: 'bar', fizz: 'buzz' }],
      pass: ['foo', { foo: 'bar', fizz: 'buzz' }],
      ignore: ['foo', { foo: 'bar', fizz: 'buzz' }]
    };

    await redactor.redactInPlace(obj);
    expect(obj.full).toEqual('REDACTED');
    expect(obj.deep).toEqual(['REDACTED', { foo: 'REDACTED', fizz: 'REDACTED' }]);
    expect(obj.shallow).toEqual(['REDACTED', { foo: 'bar', fizz: 'REDACTED' }]);
    expect(obj.pass).toEqual(['foo', { foo: 'bar', fizz: 'REDACTED' }]);
    expect(obj.ignore).toEqual(['foo', { foo: 'bar', fizz: 'buzz' }]);
  });

  it('Can handle primitive object types of various CustomObjectMatchTypes correctly', async () => {
    const customObject: CustomObject = {
      full: CustomObjectMatchType.Full,
      deep: CustomObjectMatchType.Deep,
      shallow: CustomObjectMatchType.Shallow,
      pass: CustomObjectMatchType.Pass,
      ignore: CustomObjectMatchType.Ignore
    };

    customObjectChecker = new CustomObjectChecker([customObject]);
    const redactor: ObjectRedactor = new ObjectRedactor(primitiveRedactor, secretManager, customObjectChecker);
    const obj = {
      full: 'bam',
      deep: 'bam',
      shallow: 'bam',
      pass: 'bam',
      ignore: 'bam'
    };
    await redactor.redactInPlace(obj);
    expect(obj.full).toBe(DEFAULT_REDACTED_TEXT);
    expect(obj.deep).toBe(DEFAULT_REDACTED_TEXT);
    expect(obj.shallow).toBe(DEFAULT_REDACTED_TEXT);
    expect(obj.pass).toBe('bam');
    expect(obj.ignore).toBe('bam');
  });

  it('Can redact nested special objects', async () => {
    const specialObjects = [
      {
        foo: CustomObjectMatchType.Shallow,
        bar: CustomObjectMatchType.Ignore
      }
    ];

    const input = {
      mySpecial: {
        foo: 'foo',
        bar: 'bar'
      }
    };

    customObjectChecker = new CustomObjectChecker(specialObjects);
    const redactor: ObjectRedactor = new ObjectRedactor(primitiveRedactor, secretManager, customObjectChecker);

    const result = await redactor.redactInPlace(input);
    expect(result.mySpecial.foo).toBe(DEFAULT_REDACTED_TEXT);
    expect(result.mySpecial.bar).toBe(input.mySpecial.bar);
  });

  it('Can handle special objects in arrays', async () => {
    const specialObjects = [
      {
        foo: CustomObjectMatchType.Shallow,
        bar: CustomObjectMatchType.Ignore
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

    customObjectChecker = new CustomObjectChecker(specialObjects);
    const redactor: ObjectRedactor = new ObjectRedactor(primitiveRedactor, secretManager, customObjectChecker);

    const result = await redactor.redactInPlace(input);
    result.me.forEach((value: any, index: number) => {
      expect(value.foo).toBe(DEFAULT_REDACTED_TEXT);
      expect(value.bar).toBe(input.me[index].bar);
    });
  });

  it('Ignores null or undefined special object values by default', async () => {
    const specialObject: CustomObject = {
      foo: CustomObjectMatchType.Shallow,
      bar: CustomObjectMatchType.Shallow
    };

    customObjectChecker = new CustomObjectChecker([specialObject]);
    secretManager = new SecretManager({ secretKeys: [] });
    const redactor: ObjectRedactor = new ObjectRedactor(primitiveRedactor, secretManager, customObjectChecker);
    const obj = { foo: null, bar: undefined };
    await redactor.redactInPlace(obj);
    expect(obj).toEqual({ foo: null, bar: undefined });
  });

  it('Redacts null or undefined special object values if specified', async () => {
    const specialObject: CustomObject = {
      foo: CustomObjectMatchType.Shallow,
      bar: CustomObjectMatchType.Shallow
    };
    secretManager = new SecretManager({ secretKeys: [] });
    customObjectChecker = new CustomObjectChecker([specialObject]);
    primitiveRedactor = new PrimitiveRedactor({ ignoreNullOrUndefined: false });
    const redactor: ObjectRedactor = new ObjectRedactor(primitiveRedactor, secretManager, customObjectChecker);

    const obj = { foo: null, bar: undefined };
    await redactor.redactInPlace(obj);
    expect(obj).toEqual({ foo: DEFAULT_REDACTED_TEXT, bar: DEFAULT_REDACTED_TEXT });
  });

  it('Uses the secretManager to determine if a string-specified value is a secret key for a primitive value', async () => {
    const specialObject: CustomObject = {
      a: CustomObjectMatchType.Ignore,
      b: CustomObjectMatchType.Ignore,
      c: CustomObjectMatchType.Ignore,
      secretKey: 'a',
      deepSecretKey: 'b',
      fullSecretKey: 'c'
    };

    const secretKeys: RegExp[] = [/email/];
    const deepSecretKeys: RegExp[] = [/name/];
    const fullSecretKeys: RegExp[] = [/address/];
    secretManager = new SecretManager({ secretKeys, deepSecretKeys, fullSecretKeys });
    customObjectChecker = new CustomObjectChecker([specialObject]);

    const redactor: ObjectRedactor = new ObjectRedactor(primitiveRedactor, secretManager, customObjectChecker);
    const obj = {
      a: 'email',
      b: 'name',
      c: 'address',
      secretKey: 'foo.bar@gmail.com',
      deepSecretKey: 'John Snow',
      fullSecretKey: '123 Example Ave'
    };
    await redactor.redactInPlace(obj);
    expect(obj).toEqual({
      a: 'email',
      b: 'name',
      c: 'address',
      secretKey: DEFAULT_REDACTED_TEXT,
      deepSecretKey: DEFAULT_REDACTED_TEXT,
      fullSecretKey: DEFAULT_REDACTED_TEXT
    });
  });

  it('Uses the secretManager to determine if a string-specified value is secret key for an object value', async () => {
    const specialObject: CustomObject = {
      a: CustomObjectMatchType.Ignore,
      b: CustomObjectMatchType.Ignore,
      c: CustomObjectMatchType.Ignore,
      secretKey: 'a',
      deepSecretKey: 'b',
      fullSecretKey: 'c'
    };

    const secretKeys: RegExp[] = [/email/];
    const deepSecretKeys: RegExp[] = [/name/];
    const fullSecretKeys: RegExp[] = [/address/];
    secretManager = new SecretManager({ secretKeys, deepSecretKeys, fullSecretKeys });
    customObjectChecker = new CustomObjectChecker([specialObject]);
    const redactor: ObjectRedactor = new ObjectRedactor(primitiveRedactor, secretManager, customObjectChecker);

    const obj = {
      a: 'email',
      b: 'name',
      c: 'address',
      secretKey: {
        a: 'foo',
        name: 'should be redacted'
      },
      deepSecretKey: {
        first: 'John',
        last: 'Snow'
      },
      fullSecretKey: {
        this: 'should',
        be: 'stringified and redacted'
      }
    };
    await redactor.redactInPlace(obj);
    expect(obj).toEqual({
      a: 'email',
      b: 'name',
      c: 'address',
      secretKey: {
        a: 'foo',
        name: DEFAULT_REDACTED_TEXT
      },
      deepSecretKey: {
        first: DEFAULT_REDACTED_TEXT,
        last: DEFAULT_REDACTED_TEXT
      },
      fullSecretKey: DEFAULT_REDACTED_TEXT
    });
  });

  it('Uses the secretManager to determine if a string-specified value is a secret key for an array value', async () => {
    const specialObject: CustomObject = {
      a: CustomObjectMatchType.Ignore,
      b: CustomObjectMatchType.Ignore,
      c: CustomObjectMatchType.Ignore,
      secretKey: 'a',
      deepSecretKey: 'b',
      fullSecretKey: 'c'
    };

    const secretKeys: RegExp[] = [/email/];
    const deepSecretKeys: RegExp[] = [/name/];
    const fullSecretKeys: RegExp[] = [/address/];
    secretManager = new SecretManager({ secretKeys, deepSecretKeys, fullSecretKeys });
    customObjectChecker = new CustomObjectChecker([specialObject]);
    const redactor: ObjectRedactor = new ObjectRedactor(primitiveRedactor, secretManager, customObjectChecker);

    const obj = {
      a: 'email',
      b: 'name',
      c: 'address',
      secretKey: ['foo', { email: 'should_be_redacted', fizz: 'buzz' }],
      deepSecretKey: ['foo', { email: 'should_be_redacted', fizz: 'buzz' }],
      fullSecretKey: ['foo', { email: 'should_be_redacted', fizz: 'buzz' }]
    };
    await redactor.redactInPlace(obj);
    expect(obj).toEqual({
      a: 'email',
      b: 'name',
      c: 'address',
      secretKey: [DEFAULT_REDACTED_TEXT, { email: DEFAULT_REDACTED_TEXT, fizz: 'buzz' }],
      deepSecretKey: [DEFAULT_REDACTED_TEXT, { email: DEFAULT_REDACTED_TEXT, fizz: DEFAULT_REDACTED_TEXT }],
      fullSecretKey: DEFAULT_REDACTED_TEXT
    });
  });

  it('Does not redact a value if the string-specified field does not contain a secret key', async () => {
    const specialObject: CustomObject = {
      name: CustomObjectMatchType.Ignore,
      kind: CustomObjectMatchType.Ignore,
      value: 'name'
    };
    const secretKeys: RegExp[] = [/email/];
    customObjectChecker = new CustomObjectChecker([specialObject]);
    secretManager = new SecretManager({ secretKeys });
    const redactor: ObjectRedactor = new ObjectRedactor(primitiveRedactor, secretManager, customObjectChecker);

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
      name: CustomObjectMatchType.Ignore,
      kind: CustomObjectMatchType.Ignore,
      value: 'foobar'
    };

    const secretKeys: RegExp[] = [/email/];
    customObjectChecker = new CustomObjectChecker([specialObject]);
    secretManager = new SecretManager({ secretKeys });
    const redactor: ObjectRedactor = new ObjectRedactor(primitiveRedactor, secretManager, customObjectChecker);

    const obj = { name: 'email', kind: 'String', value: 'foo.bar@gmail.com' };
    await redactor.redactInPlace(obj);
    expect(obj).toEqual({
      name: 'email',
      kind: 'String',
      value: 'foo.bar@gmail.com'
    });
  });
});
