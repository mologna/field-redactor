import { CustomObjectManager } from './customObjectManager';
import { ObjectRedactor } from './objectRedactor';
import { PrimitiveRedactor } from './primitiveRedactor';
import { resolveSecretKeys } from './redactionRules';
import { SecretManager } from './secretManager';
import { FieldRedactorConfig } from './types';
import { EMPTY_VALUE_PATTERN_MATCHER, ValuePatternMatcher } from './valuePatternMatcher';

export type FieldRedactorDeps = {
  primitiveRedactor: PrimitiveRedactor;
  secretManager: SecretManager;
  valuePatternMatcher: ValuePatternMatcher;
  customObjectManager: CustomObjectManager;
  objectRedactor: ObjectRedactor;
  usesAsyncRedactor: boolean;
  cloneInput: boolean;
};

export const buildFieldRedactorDeps = (config?: FieldRedactorConfig): FieldRedactorDeps => {
  const {
    redactor,
    syncRedactor,
    deepSecretKeys,
    fullSecretKeys,
    deleteSecretKeys,
    customObjects,
    valuePatterns
  } = config ?? {};

  const ignoreNullOrUndefined =
    typeof config?.ignoreNullOrUndefined === 'boolean' ? config.ignoreNullOrUndefined : true;
  const ignoreBooleans = typeof config?.ignoreBooleans === 'boolean' ? config.ignoreBooleans : false;
  const cloneInput = config?.cloneInput !== false;

  const primitiveRedactor = new PrimitiveRedactor({
    ignoreBooleans,
    ignoreNullOrUndefined,
    redactor,
    syncRedactor
  });

  const secretManager = new SecretManager({
    secretKeys: resolveSecretKeys(config),
    deepSecretKeys,
    fullSecretKeys,
    deleteSecretKeys
  });
  const valuePatternMatcher = valuePatterns?.length ? new ValuePatternMatcher(valuePatterns) : EMPTY_VALUE_PATTERN_MATCHER;
  const customObjectManager = new CustomObjectManager(customObjects, config?.schemaNames);
  const objectRedactor = new ObjectRedactor(
    primitiveRedactor,
    secretManager,
    customObjectManager,
    valuePatternMatcher
  );

  return {
    primitiveRedactor,
    secretManager,
    valuePatternMatcher,
    customObjectManager,
    objectRedactor,
    usesAsyncRedactor: primitiveRedactor.usesAsyncRedactor(),
    cloneInput
  };
};
