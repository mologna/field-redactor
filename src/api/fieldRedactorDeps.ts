import { CustomObjectManager } from '../rules/customObjectManager';
import { ObjectRedactor } from '../engine/objectRedactor';
import { PrimitiveRedactor } from '../engine/primitiveRedactor';
import { resolveSecretKeys } from '../config/redactionRules';
import { SecretManager } from '../rules/secretManager';
import { FieldRedactorConfig } from '../types';
import { EMPTY_PATH_RULE_MATCHER, PathRuleMatcher } from '../rules/pathRuleMatcher';
import { EMPTY_VALUE_PATTERN_MATCHER, ValuePatternMatcher } from '../rules/valuePatternMatcher';

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

const resolveBoolean = (value: boolean | undefined, defaultValue: boolean): boolean =>
  typeof value === 'boolean' ? value : defaultValue;

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

  const primitiveRedactor = new PrimitiveRedactor({
    ignoreBooleans: resolveBoolean(config?.ignoreBooleans, false),
    ignoreNullOrUndefined: resolveBoolean(config?.ignoreNullOrUndefined, true),
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
    cloneInput: config?.cloneInput !== false
  };
};
