import { FieldRedactor, FieldRedactorImpl } from "../../../src/new/FieldRedactor";
import { validInputWithAllTypes, validNestedInputWithAllTypes } from "./mocks";

describe('NewFieldRedactor', () => {
  const DEFAULT_REDACTED_TEXT: string = 'REDACTED';

  const validateRedactorOutput = (input: any, output: any, redactedText: string, secretKeys?: string[]) => {
    for (const key of Object.keys(output)) {
      if (typeof output[key] === 'object' && !!output[key]) {
        validateRedactorOutput(input[key], output[key], redactedText);
      } else if (!secretKeys || (secretKeys && secretKeys.includes(key))) {
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
    const secretKeys: string[] = ["userId", "password", "acctBalance"];
    const redactor: FieldRedactor = new FieldRedactorImpl({
      secretKeys
    });
    const redacted = redactor.redact(validInputWithAllTypes);
    console.log(redacted);
    console.log(redacted);
    expect(redacted).not.toBe(validInputWithAllTypes);
    validateRedactorOutput(validInputWithAllTypes, redacted, DEFAULT_REDACTED_TEXT, secretKeys);
  });
});
