import { CustomObjectManager } from '../rules/customObjectManager';
import { PathRuleMatcher } from '../rules/pathRuleMatcher';
import { RuleResolver, buildPathRules as buildPathRulesFromResolver } from '../rules/ruleResolver';
import { SecretManager } from '../rules/secretManager';
import { ValuePatternMatcher } from '../rules/valuePatternMatcher';
import { DryRunPathRule, JsonValue } from '../types';

export { RuleResolver } from '../rules/ruleResolver';

const createResolver = (
  secretManager: SecretManager,
  pathRuleMatcher: PathRuleMatcher,
  valuePatternMatcher: ValuePatternMatcher,
  manager: CustomObjectManager
): RuleResolver => new RuleResolver(secretManager, pathRuleMatcher, valuePatternMatcher, manager);

export const buildPathRules = (
  before: JsonValue | undefined,
  redactedPaths: readonly string[],
  deletedPaths: readonly string[],
  secretManager: SecretManager,
  manager: CustomObjectManager,
  valuePatternMatcher: ValuePatternMatcher,
  pathRuleMatcher: PathRuleMatcher
): DryRunPathRule[] =>
  buildPathRulesFromResolver(
    before,
    redactedPaths,
    deletedPaths,
    createResolver(secretManager, pathRuleMatcher, valuePatternMatcher, manager)
  );

export const attributeDeletePathRule = (
  before: JsonValue | undefined,
  path: string,
  secretManager: SecretManager,
  pathRuleMatcher: PathRuleMatcher,
  manager: CustomObjectManager,
  valuePatternMatcher: ValuePatternMatcher
): DryRunPathRule =>
  createResolver(secretManager, pathRuleMatcher, valuePatternMatcher, manager).attributeDeletePath(before, path);

export const attributeRedactPathRule = (
  before: JsonValue | undefined,
  path: string,
  secretManager: SecretManager,
  manager: CustomObjectManager,
  valuePatternMatcher: ValuePatternMatcher,
  pathRuleMatcher: PathRuleMatcher
): DryRunPathRule =>
  createResolver(secretManager, pathRuleMatcher, valuePatternMatcher, manager).attributeRedactPath(before, path);
