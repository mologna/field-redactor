import { ObjectRedactorTraversal } from '../../src/engine/objectRedactorTraversal';
import { PrimitiveRedactor } from '../../src/engine/primitiveRedactor';
import { SecretManager } from '../../src/rules/secretManager';
import { CustomObjectManager } from '../../src/rules/customObjectManager';
import { EMPTY_VALUE_PATTERN_MATCHER, ValuePatternMatcher } from '../../src/rules/valuePatternMatcher';
import { EMPTY_PATH_RULE_MATCHER, PathRuleMatcher } from '../../src/rules/pathRuleMatcher';
import { CustomObject, SecretManagerConfig } from '../../src/types';
import { buildFieldRedactorDeps, FieldRedactorDeps } from '../../src/api/fieldRedactorDeps';

export { EMPTY_VALUE_PATTERN_MATCHER, EMPTY_PATH_RULE_MATCHER };

export type ObjectRedactorTestOptions = {
  secretManagerConfig?: SecretManagerConfig;
  valuePatternMatcher?: ValuePatternMatcher;
  pathRuleMatcher?: PathRuleMatcher;
  customObjects?: CustomObject[];
  primitiveRedactor?: PrimitiveRedactor;
  customObjectManager?: CustomObjectManager;
};

const buildTestDeps = (options: ObjectRedactorTestOptions = {}): FieldRedactorDeps =>
  buildFieldRedactorDeps({
    secretKeys: options.secretManagerConfig?.secretKeys,
    deepSecretKeys: options.secretManagerConfig?.deepSecretKeys,
    opaqueSecretKeys: options.secretManagerConfig?.opaqueSecretKeys,
    removeSecretKeys: options.secretManagerConfig?.removeSecretKeys,
    fullSecretKeys: options.secretManagerConfig?.fullSecretKeys,
    deleteSecretKeys: options.secretManagerConfig?.deleteSecretKeys,
    passKeys: options.secretManagerConfig?.passKeys,
    customObjects: options.customObjects
  });

const buildTraversal = (
  options: ObjectRedactorTestOptions,
  deps: FieldRedactorDeps
): ObjectRedactorTraversal =>
  new ObjectRedactorTraversal(
    options.primitiveRedactor ?? deps.primitiveRedactor,
    options.secretManagerConfig ? new SecretManager(options.secretManagerConfig) : deps.secretManager,
    options.customObjectManager ?? deps.customObjectManager,
    options.valuePatternMatcher ?? deps.valuePatternMatcher,
    options.pathRuleMatcher ?? deps.pathRuleMatcher
  );

export const createTraversal = (options: ObjectRedactorTestOptions = {}): ObjectRedactorTraversal => {
  const deps = buildTestDeps(options);
  if (
    !options.primitiveRedactor &&
    !options.secretManagerConfig &&
    !options.customObjectManager &&
    !options.valuePatternMatcher &&
    !options.pathRuleMatcher
  ) {
    return deps.traversal;
  }

  return buildTraversal(options, deps);
};
