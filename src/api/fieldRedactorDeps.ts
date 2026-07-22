import { CustomObjectManager } from '../rules/customObjectManager';
import { ObjectRedactor } from '../engine/objectRedactor';
import { PrimitiveRedactor } from '../engine/primitiveRedactor';
import { normalizeFieldRedactorConfig, resolveSecretKeys } from '../config/redactionRules';
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
  const normalized = normalizeFieldRedactorConfig(config) ?? {};
  const {
    redactor,
    syncRedactor,
    deepSecretKeys,
    opaqueSecretKeys,
    removeSecretKeys,
    customObjects,
    valuePatterns,
    pathRules,
    passKeys
  } = normalized;

  const primitiveRedactor = new PrimitiveRedactor({
    ignoreBooleans: resolveBoolean(normalized.ignoreBooleans, false),
    ignoreNullOrUndefined: resolveBoolean(normalized.ignoreNullOrUndefined, true),
    redactor,
    syncRedactor
  });

  const secretManager = new SecretManager({
    secretKeys: resolveSecretKeys(normalized),
    deepSecretKeys,
    opaqueSecretKeys,
    removeSecretKeys,
    passKeys
  });
  const valuePatternMatcher = valuePatterns?.length ? new ValuePatternMatcher(valuePatterns) : EMPTY_VALUE_PATTERN_MATCHER;
  const pathRuleMatcher = pathRules?.length ? new PathRuleMatcher(pathRules) : EMPTY_PATH_RULE_MATCHER;
  const customObjectManager = new CustomObjectManager(customObjects, normalized.schemaNames);
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
    cloneInput: normalized.cloneInput !== false
  };
};
