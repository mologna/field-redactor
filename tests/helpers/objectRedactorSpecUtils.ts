import rfdc from 'rfdc';
import { SecretManager } from '../../src/rules/secretManager';
import { SecretManagerConfig, TraversableJson } from '../../src/types';
import { ObjectRedactor } from '../../src/engine/objectRedactor';
import { PrimitiveRedactor } from '../../src/engine/primitiveRedactor';
import { CustomObjectManager } from '../../src/rules/customObjectManager';
import { createObjectRedactor, EMPTY_PATH_RULE_MATCHER, EMPTY_VALUE_PATTERN_MATCHER } from './redactorTestUtils';

export { EMPTY_PATH_RULE_MATCHER, EMPTY_VALUE_PATTERN_MATCHER };

export const DEFAULT_REDACTED_TEXT = 'REDACTED';

export const deepCopy = rfdc({ proto: true, circles: true });

export const redactCopy = (redactor: ObjectRedactor, value: TraversableJson) =>
  redactor.redactCopyOnWrite(deepCopy(value));

export const validateRedactorOutput = (
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

export type ObjectRedactorFixture = {
  primitiveRedactor: PrimitiveRedactor;
  secretManager: SecretManager;
  customObjectManager: CustomObjectManager;
  basicObjectRedactor: ObjectRedactor;
  makeRedactor: (secretManagerConfig?: SecretManagerConfig) => ObjectRedactor;
};

export const makeObjectRedactorFixture = (): ObjectRedactorFixture => {
  const primitiveRedactor = new PrimitiveRedactor({ ignoreBooleans: false, ignoreNullOrUndefined: true });
  const secretManager = new SecretManager({});
  const customObjectManager = new CustomObjectManager();
  const makeRedactor = (secretManagerConfig: SecretManagerConfig = {}) =>
    createObjectRedactor({ secretManagerConfig, primitiveRedactor, customObjectManager });

  return {
    primitiveRedactor,
    secretManager,
    customObjectManager,
    basicObjectRedactor: makeRedactor(),
    makeRedactor
  };
};
