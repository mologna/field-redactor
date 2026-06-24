import { CustomObjectManager } from './customObjectManager';
import { getStringSpecifiedCustomObjectSecretKeyValueIfExists, toRedactablePrimitive } from './objectRedactorHelpers';
import { getJsonValueAtPath, getParentContext, parseJsonPath } from './jsonWalk';
import { SecretManager } from './secretManager';
import { ValuePatternMatcher } from './valuePatternMatcher';
import {
  DryRunPathRule,
  isJsonObject,
  JsonLeafValue,
  JsonValue,
  RedactionRuleLabel,
  SecretSpecifierValue
} from './types';

type KeyRule = Exclude<RedactionRuleLabel, 'schema' | 'default' | 'value'>;

type RedactAttributionContext = {
  before: JsonValue | undefined;
  path: string;
  segments: Array<string | number>;
  objectKeys: string[];
  secretManager: SecretManager;
  manager: CustomObjectManager;
  valuePatternMatcher: ValuePatternMatcher;
};

const objectKeysFromPath = (segments: Array<string | number>): string[] =>
  segments.filter((segment): segment is string => typeof segment === 'string');

const toPathRule = (
  path: string,
  action: DryRunPathRule['action'],
  rule: RedactionRuleLabel,
  extras: Partial<Pick<DryRunPathRule, 'pattern' | 'schemaIndex' | 'schemaName'>> = {}
): DryRunPathRule => ({ path, action, rule, ...extras });

const patternForKey = (secretManager: SecretManager, key: SecretSpecifierValue, rule: KeyRule): string | undefined =>
  secretManager.getKeyRulePattern(key, rule);

const attributeKeyRule = (
  path: string,
  action: DryRunPathRule['action'],
  key: SecretSpecifierValue,
  secretManager: SecretManager
): DryRunPathRule => {
  const rule = secretManager.classifyKeyRule(key) ?? 'default';
  if (rule === 'default') {
    return toPathRule(path, action, rule);
  }

  return toPathRule(path, action, rule, { pattern: patternForKey(secretManager, key, rule) });
};

const trySchemaRule = ({
  before,
  path,
  segments,
  secretManager,
  manager
}: RedactAttributionContext): DryRunPathRule | undefined => {
  const { parent, leaf } = getParentContext(before, segments);
  if (!isJsonObject(parent) || typeof leaf !== 'string') {
    return undefined;
  }

  const schema = manager.getMatchingCustomObject(parent);
  if (!schema || !(leaf in schema)) {
    return undefined;
  }

  let pattern: string | undefined;
  if (typeof schema[leaf] === 'string') {
    const siblingSpecifier = getStringSpecifiedCustomObjectSecretKeyValueIfExists(parent, schema, leaf);
    if (siblingSpecifier !== undefined) {
      const siblingRule = secretManager.classifyKeyRule(siblingSpecifier);
      if (siblingRule && siblingRule !== 'default') {
        pattern = patternForKey(secretManager, siblingSpecifier, siblingRule);
      }
    }
  }

  return toPathRule(path, 'redact', 'schema', {
    ...manager.getSchemaMetadata(schema),
    ...(pattern ? { pattern } : {})
  });
};

const tryEnclosingOpaqueOrDeep = ({
  path,
  objectKeys,
  secretManager
}: RedactAttributionContext): DryRunPathRule | undefined => {
  for (let index = objectKeys.length - 2; index >= 0; index--) {
    const key = objectKeys[index];
    const rule = secretManager.classifyKeyRule(key);
    if (rule === 'opaque' || rule === 'deep') {
      return toPathRule(path, 'redact', rule, { pattern: patternForKey(secretManager, key, rule) });
    }
  }

  return undefined;
};

const tryLeafKeyRule = ({
  path,
  objectKeys,
  secretManager
}: RedactAttributionContext): DryRunPathRule | undefined => {
  const leafKey = objectKeys.at(-1);
  if (!leafKey || !secretManager.classifyKeyRule(leafKey)) {
    return undefined;
  }

  return attributeKeyRule(path, 'redact', leafKey, secretManager);
};

const tryValuePatternRule = ({
  before,
  path,
  segments,
  valuePatternMatcher
}: RedactAttributionContext): DryRunPathRule | undefined => {
  const value = getJsonValueAtPath(before, segments);
  if (value === undefined || (typeof value !== 'string' && typeof value !== 'number')) {
    return undefined;
  }

  const match = valuePatternMatcher.findMatching(toRedactablePrimitive(value as JsonLeafValue));
  if (!match) {
    return undefined;
  }

  return toPathRule(path, 'redact', 'value', { pattern: valuePatternMatcher.formatPattern(match) });
};

const REDACT_RULE_RESOLVERS = [
  trySchemaRule,
  tryEnclosingOpaqueOrDeep,
  tryLeafKeyRule,
  tryValuePatternRule
] as const;

export const attributeDeletePathRule = (
  before: JsonValue | undefined,
  path: string,
  secretManager: SecretManager
): DryRunPathRule => {
  const deleteKey = objectKeysFromPath(parseJsonPath(path)).at(-1);
  if (deleteKey) {
    return attributeKeyRule(path, 'delete', deleteKey, secretManager);
  }

  return toPathRule(path, 'delete', 'default');
};

export const attributeRedactPathRule = (
  before: JsonValue | undefined,
  path: string,
  secretManager: SecretManager,
  manager: CustomObjectManager,
  valuePatternMatcher: ValuePatternMatcher
): DryRunPathRule => {
  const segments = parseJsonPath(path);
  const context: RedactAttributionContext = {
    before,
    path,
    segments,
    objectKeys: objectKeysFromPath(segments),
    secretManager,
    manager,
    valuePatternMatcher
  };

  for (const resolve of REDACT_RULE_RESOLVERS) {
    const rule = resolve(context);
    if (rule) {
      return rule;
    }
  }

  return toPathRule(path, 'redact', 'default');
};

export const buildPathRules = (
  before: JsonValue | undefined,
  redactedPaths: readonly string[],
  deletedPaths: readonly string[],
  secretManager: SecretManager,
  manager: CustomObjectManager,
  valuePatternMatcher: ValuePatternMatcher
): DryRunPathRule[] => [
  ...deletedPaths.map((path) => attributeDeletePathRule(before, path, secretManager)),
  ...redactedPaths.map((path) => attributeRedactPathRule(before, path, secretManager, manager, valuePatternMatcher))
];
