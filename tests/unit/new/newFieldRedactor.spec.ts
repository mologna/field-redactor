import * as crypto from 'crypto';
import { FieldRedactor, FieldRedactorImpl } from "../../../src/new/FieldRedactor";
import { SecretManager } from "../../../src/new/secret/secretManager";
import { validInputWithAllTypes, validNestedInputWithAllTypes } from "./mocks";
import { Redactor } from '../../../src/new/redactor/redactor';

describe('NewFieldRedactor', () => {
  const DEFAULT_REDACTED_TEXT: string = 'REDACTED';

  const validateRedactorOutput = (input: any, output: any, redactedText: string, secretKeys?: RegExp[]) => {
    const manager = new SecretManager(secretKeys);
    for (const key of Object.keys(output)) {
      if (typeof output[key] === 'object' && !!output[key]) {
        validateRedactorOutput(input[key], output[key], redactedText);
      } else if (!secretKeys || (secretKeys && manager.isSecretKey(key))) {
        expect(output[key]).toBe(redactedText);
      } else {
        expect(output[key]).toBe(input[key]);
      }
    }
  }


  it('Should throw an exception when given a value thats not a JSON object', () => {
    const inputError: string = "Input value must be a JSON object";
    const redactor: FieldRedactor = new FieldRedactorImpl();
    expect(() => redactor.redact(null)).toThrow(inputError);
    expect(() => redactor.redact(undefined)).toThrow(inputError);
    expect(() => redactor.redact(new Date())).toThrow(inputError);
    expect(() => redactor.redact(1)).toThrow(inputError);
    expect(() => redactor.redact("foobar")).toThrow(inputError);
    expect(() => redactor.redact(() => {})).toThrow(inputError);
  });

  it('Should return a redacted copy of the input JSON for all value types', () => {
    const redactor: FieldRedactor = new FieldRedactorImpl();
    const redacted = redactor.redact(validInputWithAllTypes);
    expect(redacted).not.toBe(validInputWithAllTypes);
    validateRedactorOutput(validInputWithAllTypes, redacted, DEFAULT_REDACTED_TEXT);
  });

  it('Should be able to handle nested JSON objects of various types, sizes, and lengths', () => {
    const redactor: FieldRedactor = new FieldRedactorImpl();
    const redacted = redactor.redact(validNestedInputWithAllTypes);
    expect(redacted).not.toBe(validNestedInputWithAllTypes);
    validateRedactorOutput(validNestedInputWithAllTypes, redacted, DEFAULT_REDACTED_TEXT);
  });

  it('Can use custom redaction text', () => {
    const replacementText: string = "foobar";
    const redactor: FieldRedactor = new FieldRedactorImpl({ replacementText });
    const redacted = redactor.redact(validInputWithAllTypes);
    expect(redacted).not.toBe(validInputWithAllTypes);
    validateRedactorOutput(validInputWithAllTypes, redacted, replacementText);
  });

  it('Can redact only specific keys', () => {
    const secretKeys: RegExp[] = [/userId/, /password/, /acctBalance/];
    const redactor: FieldRedactor = new FieldRedactorImpl({
      secretKeys
    });
    const redacted = redactor.redact(validInputWithAllTypes);
    console.log(redacted);
    expect(redacted).not.toBe(validInputWithAllTypes);
    validateRedactorOutput(validInputWithAllTypes, redacted, DEFAULT_REDACTED_TEXT, secretKeys);
  });

  it('Redacts all values under a deeply nested key when specified', () => {
    const secretKeys: RegExp[] = [/password/, /acctBalance/, /parentAccount/];
    const deepSecretKeys: RegExp[] = [/parentAccount/];
    const redactor: FieldRedactor = new FieldRedactorImpl({
      secretKeys,
      deepSecretKeys
    });
    const simpleNestedInputWithDeepSecret = {
      password: "password123",
      username: "child",
      foo: "bar",
      parentAccount: {
        foo: "bar",
        biz: "baz",
        fizz: {
          buzz: "fizzbuzz"
        }
      }
    }
    const redacted = redactor.redact(simpleNestedInputWithDeepSecret);
    
    expect(redacted).not.toBe(simpleNestedInputWithDeepSecret);
    expect(redacted.password).toBe(DEFAULT_REDACTED_TEXT);
    expect(redacted.username).toBe(simpleNestedInputWithDeepSecret.username);
    expect(redacted.parentAccount.foo).toBe(DEFAULT_REDACTED_TEXT);
    expect(redacted.parentAccount.biz).toBe(DEFAULT_REDACTED_TEXT);
    expect(redacted.parentAccount.fizz.buzz).toBe(DEFAULT_REDACTED_TEXT);
  });

  it('Allows user to specify their own redactor', () => {
    const foo = "foo";
    const hashedFoo = 'acbd18db4cc2f85cedef654fccc4a4d8';
    const customRedactor: Redactor = (value: any) => {
      return crypto.createHash('md5').update(value).digest('hex');
    };
    const simpleObject = {
      foo
    }

    const redactor: FieldRedactor = new FieldRedactorImpl({
      redactor: customRedactor
    });

    const result = redactor.redact(simpleObject);
    expect(result.foo).toBe(hashedFoo);
  });
});
