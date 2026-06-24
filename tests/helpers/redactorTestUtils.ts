import { ObjectRedactorSyncTraversal } from '../../src/objectRedactorSync';
import { ObjectRedactorTraversal } from '../../src/objectRedactorTraversal';
import { ObjectRedactor } from '../../src/objectRedactor';
import { PrimitiveRedactor } from '../../src/primitiveRedactor';
import { SecretManager } from '../../src/secretManager';
import { CustomObjectManager } from '../../src/customObjectManager';
import { EMPTY_VALUE_PATTERN_MATCHER, ValuePatternMatcher } from '../../src/valuePatternMatcher';
import { EMPTY_PATH_RULE_MATCHER, PathRuleMatcher } from '../../src/pathRuleMatcher';
import { CustomObject, SecretManagerConfig } from '../../src/types';
import { buildFieldRedactorDeps, FieldRedactorDeps } from '../../src/fieldRedactorDeps';

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

export const createObjectRedactor = (options: ObjectRedactorTestOptions = {}): ObjectRedactor => {
  const deps = buildTestDeps(options);
  if (
    !options.primitiveRedactor &&
    !options.secretManagerConfig &&
    !options.customObjectManager &&
    !options.valuePatternMatcher &&
    !options.pathRuleMatcher
  ) {
    return deps.objectRedactor;
  }

  return new ObjectRedactor(
    options.primitiveRedactor ?? deps.primitiveRedactor,
    options.secretManagerConfig ? new SecretManager(options.secretManagerConfig) : deps.secretManager,
    options.customObjectManager ?? deps.customObjectManager,
    options.valuePatternMatcher ?? deps.valuePatternMatcher,
    options.pathRuleMatcher ?? deps.pathRuleMatcher
  );
};

export const createSyncTraversal = (options: ObjectRedactorTestOptions = {}): ObjectRedactorSyncTraversal => {
  const deps = buildTestDeps(options);
  return buildTraversal(options, deps);
};
