import { CustomObjectManager } from './customObjectManager';
import { ObjectRedactor } from './objectRedactor';
import { PrimitiveRedactor } from './primitiveRedactor';
import { resolveSecretKeys } from './redactionRules';
import { SecretManager } from './secretManager';
import { FieldRedactorConfig } from './types';
import { EMPTY_PATH_RULE_MATCHER, PathRuleMatcher } from './pathRuleMatcher';
import { EMPTY_VALUE_PATTERN_MATCHER, ValuePatternMatcher } from './valuePatternMatcher';

export type FieldRedactorDeps = {
  primitiveRedactor: PrimitiveRedactor;
  secretManager: SecretManager;
  valuePatternMatcher: ValuePatternMatcher;
  pathRuleMatcher: PathRuleMatcher;
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
    valuePatterns,
    pathRules,
    passKeys
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
    deleteSecretKeys,
    passKeys
  });
  const valuePatternMatcher = valuePatterns?.length ? new ValuePatternMatcher(valuePatterns) : EMPTY_VALUE_PATTERN_MATCHER;
  const pathRuleMatcher = pathRules?.length ? new PathRuleMatcher(pathRules) : EMPTY_PATH_RULE_MATCHER;
  const customObjectManager = new CustomObjectManager(customObjects, config?.schemaNames);
  const objectRedactor = new ObjectRedactor(
    primitiveRedactor,
    secretManager,
    customObjectManager,
    valuePatternMatcher,
    pathRuleMatcher
  );

  return {
    primitiveRedactor,
    secretManager,
    valuePatternMatcher,
    pathRuleMatcher,
    customObjectManager,
    objectRedactor,
    usesAsyncRedactor: primitiveRedactor.usesAsyncRedactor(),
    cloneInput
  };
};
