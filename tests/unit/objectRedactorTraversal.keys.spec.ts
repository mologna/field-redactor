import * as crypto from 'crypto';
import { SecretManager } from '../../src/rules/secretManager';
import { validInputWithAllTypes, validNestedInputWithAllTypes } from '../mocks/inputMocks';
import { Redactor } from '../../src/types';
import { ObjectRedactorTraversal } from '../../src/engine/objectRedactorTraversal';
import { PrimitiveRedactor } from '../../src/engine/primitiveRedactor';
import {
  DEFAULT_REDACTED_TEXT,
  deepCopy,
  makeObjectRedactorTraversalFixture,
  ObjectRedactorTraversalFixture,
  redactCopy,
  validateRedactorOutput,
  createTraversalFromFixture
} from '../helpers/objectRedactorTraversalSpecUtils';

describe('ObjectRedactorTraversal keys', () => {
  let fixture: ObjectRedactorTraversalFixture;

  beforeEach(() => {
    fixture = makeObjectRedactorTraversalFixture();
  });

describe('Basic/Primitive Secret Redaction', () => {
  it('Should return a redacted copy of the input JSON for all value types', async () => {
    const copy = redactCopy(fixture.basicTraversal, validInputWithAllTypes);
    expect(copy).not.toBe(validInputWithAllTypes);
    validateRedactorOutput(validInputWithAllTypes, copy, DEFAULT_REDACTED_TEXT);
  });

  it('Should be able to handle nested JSON objects of various types, sizes, and lengths', async () => {
    const copy = redactCopy(fixture.basicTraversal, validNestedInputWithAllTypes);
    expect(copy).not.toBe(validNestedInputWithAllTypes);
    validateRedactorOutput(validNestedInputWithAllTypes, copy, DEFAULT_REDACTED_TEXT);
  });

  it('Can redact all common values in an array', async () => {
    const testArray = ['foo', new Date(), 12, 123.45, true];

    const input = { testArray };
    await fixture.basicTraversal.redactInPlace(input);
    input.testArray.forEach((value: any) => {
      expect(value).toBe(DEFAULT_REDACTED_TEXT);
    });
  });

  it('Skips nulls and undefined when included in an array', async () => {
    const testArray = [null, undefined];
    const input = { testArray };
    await fixture.basicTraversal.redactInPlace(input);
    input.testArray.forEach((value: any, index: number) => {
      expect(value).toBe(testArray[index]);
    });
  });

  it('Redacts only keys specified as secrets when secrets passed', async () => {
    const secretKeys: RegExp[] = [/userId/, /password/, /acctBalance/];
    fixture.secretManager = new SecretManager({ secretKeys });
    const redactor: ObjectRedactorTraversal = createTraversalFromFixture(fixture);
    const copy = redactCopy(redactor, validInputWithAllTypes);
    expect(copy).not.toBe(validInputWithAllTypes);
    validateRedactorOutput(validInputWithAllTypes, copy, DEFAULT_REDACTED_TEXT, false, secretKeys);
  });

  it('Can delete keys when specified as removeSecretKeys', async () => {
    const removeSecretKeys: RegExp[] = [/userId/, /password/, /acctBalance/];
    fixture.secretManager = new SecretManager({ removeSecretKeys });
    const redactor: ObjectRedactorTraversal = createTraversalFromFixture(fixture);
    const copy = deepCopy(validInputWithAllTypes);
    await redactor.redactInPlace(copy);
    expect(copy).not.toBe(validInputWithAllTypes);
    expect(copy.userId).toBeUndefined();
    expect(copy.password).toBeUndefined();
    expect(copy.acctBalance).toBeUndefined();
  });

  it('Can perform deepRedaction on objects and arrays when deepSecretKey matches', async () => {
    const secretKeys: RegExp[] = [/password/, /acctBalance/, /parentAccount/];
    const deepSecretKeys: RegExp[] = [/parentAccount/];
    fixture.secretManager = new SecretManager({ secretKeys, deepSecretKeys });
    const redactor: ObjectRedactorTraversal = createTraversalFromFixture(fixture);
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

  it('Can perform fullRedaction on objects and arrays when fullSecretKey matches', async () => {
    fixture.primitiveRedactor = new PrimitiveRedactor({ ignoreNullOrUndefined: false, ignoreBooleans: true });
    fixture.secretManager = new SecretManager({
      opaqueSecretKeys: [/foo/, /bar/, /undefinedValue/, /nullValue/],
      secretKeys: []
    });
    const redactor: ObjectRedactorTraversal = createTraversalFromFixture(fixture);

    const input = {
      foo: {
        bar: {
          fizz: 'buzz',
          bim: 'bam'
        },
        a: 'b'
      },
      bar: ['fizz', 'buzz'],
      bim: 'bam',
      undefinedValue: undefined,
      nullValue: null
    };

    const redacted = await redactor.redactInPlace(input);
    expect(redacted.foo).toBe(DEFAULT_REDACTED_TEXT);
    expect(redacted.bar).toBe(DEFAULT_REDACTED_TEXT);
    expect(redacted.undefinedValue).toBe(DEFAULT_REDACTED_TEXT);
    expect(redacted.nullValue).toBe(DEFAULT_REDACTED_TEXT);
    expect(redacted.bim).toBe('bam');
  });

  it('Allows user to specify their own redactor', async () => {
    const foo = 'foo';
    const hashedFoo = 'acbd18db4cc2f85cedef654fccc4a4d8';
    const customRedactor: Redactor = (value: any) => {
      return Promise.resolve(crypto.createHash('md5').update(value).digest('hex'));
    };
    fixture.primitiveRedactor = new PrimitiveRedactor({
      redactor: customRedactor,
      ignoreNullOrUndefined: true,
      ignoreBooleans: false
    });
    const simpleObject = {
      foo
    };

    const redactor: ObjectRedactorTraversal = createTraversalFromFixture(fixture);

    const result = await redactor.redactInPlaceAsync(simpleObject);
    expect(result.foo).toBe(hashedFoo);
  });
});
});
