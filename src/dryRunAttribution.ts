import { CustomObjectManager } from './customObjectManager';
import { getStringSpecifiedCustomObjectSecretKeyValueIfExists } from './objectRedactorHelpers';
import { getParentContext, getJsonValueAtPath, parseJsonPath } from './jsonWalk';
import { SecretManager } from './secretManager';
import { ValuePatternMatcher } from './valuePatternMatcher';
import { DryRunPathRule, isJsonObject, JsonLeafValue, JsonObject, JsonValue, RedactionRuleLabel, SecretSpecifierValue } from './types';
import { toRedactablePrimitive } from './objectRedactorHelpers';

type KeyRule = Exclude<RedactionRuleLabel, 'schema' | 'default' | 'value'>;

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

const attributeSchemaRule = (
  path: string,
  parent: JsonObject,
  leafKey: string,
  secretManager: SecretManager,
  manager: CustomObjectManager
): DryRunPathRule | undefined => {
  const schema = manager.getMatchingCustomObject(parent);
  if (!schema || !(leafKey in schema)) {
    return undefined;
  }

  let pattern: string | undefined;
  if (typeof schema[leafKey] === 'string') {
    const siblingSpecifier = getStringSpecifiedCustomObjectSecretKeyValueIfExists(parent, schema, leafKey);
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

const findEnclosingOpaqueOrDeep = (
  objectKeys: string[],
  secretManager: SecretManager
): { key: string; rule: 'opaque' | 'deep' } | undefined => {
  for (let index = objectKeys.length - 2; index >= 0; index--) {
    const key = objectKeys[index];
    const rule = secretManager.classifyKeyRule(key);
    if (rule === 'opaque' || rule === 'deep') {
      return { key, rule };
    }
  }

  return undefined;
};

const attributeValuePatternRule = (
  path: string,
  before: JsonValue | undefined,
  segments: Array<string | number>,
  matcher: ValuePatternMatcher
): DryRunPathRule | undefined => {
  const value = getJsonValueAtPath(before, segments);
  if (value === undefined || (typeof value !== 'string' && typeof value !== 'number')) {
    return undefined;
  }

  const match = matcher.findMatching(toRedactablePrimitive(value as JsonLeafValue));
  if (!match) {
    return undefined;
  }

  return toPathRule(path, 'redact', 'value', { pattern: matcher.formatPattern(match) });
};

export const attributePathRule = (
  before: JsonValue | undefined,
  path: string,
  action: DryRunPathRule['action'],
  secretManager: SecretManager,
  manager: CustomObjectManager,
  valuePatternMatcher: ValuePatternMatcher
): DryRunPathRule => {
  const segments = parseJsonPath(path);
  const objectKeys = objectKeysFromPath(segments);

  if (action === 'delete') {
    const deleteKey = objectKeys.at(-1);
    if (deleteKey) {
      return attributeKeyRule(path, 'delete', deleteKey, secretManager);
    }
  }

  const { parent, leaf } = getParentContext(before, segments);
  if (isJsonObject(parent) && typeof leaf === 'string') {
    const schemaRule = attributeSchemaRule(path, parent, leaf, secretManager, manager);
    if (schemaRule) {
      return schemaRule;
    }
  }

  const enclosingRule = findEnclosingOpaqueOrDeep(objectKeys, secretManager);
  if (enclosingRule) {
    return toPathRule(path, 'redact', enclosingRule.rule, {
      pattern: patternForKey(secretManager, enclosingRule.key, enclosingRule.rule)
    });
  }

  const leafKey = objectKeys.at(-1);
  if (leafKey && secretManager.classifyKeyRule(leafKey)) {
    return attributeKeyRule(path, 'redact', leafKey, secretManager);
  }

  if (action === 'redact') {
    const valueRule = attributeValuePatternRule(path, before, segments, valuePatternMatcher);
    if (valueRule) {
      return valueRule;
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
  ...deletedPaths.map((path) => attributePathRule(before, path, 'delete', secretManager, manager, valuePatternMatcher)),
  ...redactedPaths.map((path) => attributePathRule(before, path, 'redact', secretManager, manager, valuePatternMatcher))
];
