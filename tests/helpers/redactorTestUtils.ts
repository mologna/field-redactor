import { ObjectRedactorSyncTraversal } from '../../src/objectRedactorSync';
import { ObjectRedactorTraversal } from '../../src/objectRedactorTraversal';
import { ObjectRedactor } from '../../src/objectRedactor';
import { PrimitiveRedactor } from '../../src/primitiveRedactor';
import { SecretManager } from '../../src/secretManager';
import { CustomObjectManager } from '../../src/customObjectManager';
import { EMPTY_VALUE_PATTERN_MATCHER, ValuePatternMatcher } from '../../src/valuePatternMatcher';
import { EMPTY_PATH_RULE_MATCHER, PathRuleMatcher } from '../../src/pathRuleMatcher';
import { CustomObject, SecretManagerConfig } from '../../src/types';

export { EMPTY_VALUE_PATTERN_MATCHER, EMPTY_PATH_RULE_MATCHER };

export type ObjectRedactorTestOptions = {
  secretManagerConfig?: SecretManagerConfig;
  valuePatternMatcher?: ValuePatternMatcher;
  pathRuleMatcher?: PathRuleMatcher;
  customObjects?: CustomObject[];
  primitiveRedactor?: PrimitiveRedactor;
  customObjectManager?: CustomObjectManager;
};

const defaultPrimitiveRedactor = (): PrimitiveRedactor =>
  new PrimitiveRedactor({ ignoreBooleans: false, ignoreNullOrUndefined: true });

export const createObjectRedactor = (options: ObjectRedactorTestOptions = {}): ObjectRedactor =>
  new ObjectRedactor(
    options.primitiveRedactor ?? defaultPrimitiveRedactor(),
    new SecretManager(options.secretManagerConfig ?? {}),
    options.customObjectManager ?? new CustomObjectManager(options.customObjects),
    options.valuePatternMatcher ?? EMPTY_VALUE_PATTERN_MATCHER,
    options.pathRuleMatcher ?? EMPTY_PATH_RULE_MATCHER
  );

export const createSyncTraversal = (options: ObjectRedactorTestOptions = {}): ObjectRedactorTraversal =>
  new ObjectRedactorSyncTraversal(
    options.primitiveRedactor ?? defaultPrimitiveRedactor(),
    new SecretManager(options.secretManagerConfig ?? {}),
    options.customObjectManager ?? new CustomObjectManager(options.customObjects),
    options.valuePatternMatcher ?? EMPTY_VALUE_PATTERN_MATCHER,
    options.pathRuleMatcher ?? EMPTY_PATH_RULE_MATCHER
  );
