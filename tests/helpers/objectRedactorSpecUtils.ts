import rfdc from 'rfdc';
import { SecretManager } from '../../src/rules/secretManager';
import { SecretManagerConfig, TraversableJson } from '../../src/types';
import { ObjectRedactorTraversal } from '../../src/engine/objectRedactorTraversal';
import { PrimitiveRedactor } from '../../src/engine/primitiveRedactor';
import { CustomObjectManager } from '../../src/rules/customObjectManager';
import { createTraversal, EMPTY_PATH_RULE_MATCHER, EMPTY_VALUE_PATTERN_MATCHER } from './redactorTestUtils';

export { EMPTY_PATH_RULE_MATCHER, EMPTY_VALUE_PATTERN_MATCHER };

export const DEFAULT_REDACTED_TEXT = 'REDACTED';

export const deepCopy = rfdc({ proto: true, circles: true });

export const redactCopy = (redactor: ObjectRedactorTraversal, value: TraversableJson) =>
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
  basicObjectRedactor: ObjectRedactorTraversal;
  makeRedactor: (secretManagerConfig?: SecretManagerConfig) => ObjectRedactorTraversal;
};

/** Build traversal from the fixture's current managers (after mutating `fixture.secretManager`, etc.). */
export const createTraversalFromFixture = (fixture: ObjectRedactorFixture): ObjectRedactorTraversal =>
  new ObjectRedactorTraversal(
    fixture.primitiveRedactor,
    fixture.secretManager,
    fixture.customObjectManager,
    EMPTY_VALUE_PATTERN_MATCHER,
    EMPTY_PATH_RULE_MATCHER
  );

export const makeObjectRedactorFixture = (): ObjectRedactorFixture => {
  const primitiveRedactor = new PrimitiveRedactor({ ignoreBooleans: false, ignoreNullOrUndefined: true });
  const secretManager = new SecretManager({});
  const customObjectManager = new CustomObjectManager();
  const makeRedactor = (secretManagerConfig: SecretManagerConfig = {}) =>
    createTraversal({ secretManagerConfig, primitiveRedactor, customObjectManager });

  return {
    primitiveRedactor,
    secretManager,
    customObjectManager,
    basicObjectRedactor: makeRedactor(),
    makeRedactor
  };
};
