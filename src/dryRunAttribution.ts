import { CustomObjectManager } from './customObjectManager';
import { getStringSpecifiedCustomObjectSecretKeyValueIfExists } from './objectRedactorHelpers';
import { getParentContext, parseJsonPath } from './jsonWalk';
import { SecretManager } from './secretManager';
import { DryRunPathRule, isJsonObject, JsonValue, SecretSpecifierValue } from './types';

const objectKeysFromPath = (segments: Array<string | number>): string[] =>
  segments.filter((segment): segment is string => typeof segment === 'string');

const patternForSpecifier = (secretManager: SecretManager, specifier: SecretSpecifierValue): string | undefined => {
  const rule = secretManager.classifyKeyRule(specifier);
  if (!rule || rule === 'default') {
    return undefined;
  }

  return secretManager.getKeyRulePattern(specifier, rule);
};

const attributeSchemaRule = (
  path: string,
  parent: Record<string, JsonValue | undefined>,
  leafKey: string,
  secretManager: SecretManager,
  manager: CustomObjectManager
): DryRunPathRule | undefined => {
  const schema = manager.getMatchingCustomObject(parent);
  if (!schema || !(leafKey in schema)) {
    return undefined;
  }

  const schemaIndex = manager.getSchemaIndex(schema);
  const schemaName = manager.getSchemaName(schemaIndex);
  const schemaField = schema[leafKey];
  let pattern: string | undefined;

  if (typeof schemaField === 'string') {
    const siblingSpecifier = getStringSpecifiedCustomObjectSecretKeyValueIfExists(parent, schema, leafKey);
    if (siblingSpecifier !== undefined) {
      pattern = patternForSpecifier(secretManager, siblingSpecifier);
    }
  }

  return {
    path,
    action: 'redact',
    rule: 'schema',
    schemaIndex,
    ...(schemaName ? { schemaName } : {}),
    ...(pattern ? { pattern } : {})
  };
};

const attributeKeyRule = (
  path: string,
  action: DryRunPathRule['action'],
  key: SecretSpecifierValue,
  secretManager: SecretManager
): DryRunPathRule => {
  const rule = secretManager.classifyKeyRule(key) ?? 'default';

  return {
    path,
    action,
    rule,
    ...(rule !== 'default' ? { pattern: secretManager.getKeyRulePattern(key, rule) ?? undefined } : {})
  };
};

export const attributePathRule = (
  before: JsonValue | undefined,
  path: string,
  action: DryRunPathRule['action'],
  secretManager: SecretManager,
  manager: CustomObjectManager
): DryRunPathRule => {
  const segments = parseJsonPath(path);
  const objectKeys = objectKeysFromPath(segments);

  if (action === 'delete') {
    const deleteKey = objectKeys[objectKeys.length - 1];
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

  for (let index = objectKeys.length - 2; index >= 0; index--) {
    const enclosingKey = objectKeys[index];
    const rule = secretManager.classifyKeyRule(enclosingKey);
    if (rule === 'opaque' || rule === 'deep') {
      return {
        path,
        action: 'redact',
        rule,
        pattern: secretManager.getKeyRulePattern(enclosingKey, rule)
      };
    }
  }

  for (let index = objectKeys.length - 2; index >= 0; index--) {
    const enclosingKey = objectKeys[index];
    if (secretManager.isDeepSecretKey(enclosingKey)) {
      return {
        path,
        action: 'redact',
        rule: 'deep',
        pattern: secretManager.getKeyRulePattern(enclosingKey, 'deep')
      };
    }
  }

  const leafKey = objectKeys[objectKeys.length - 1];
  if (leafKey) {
    const rule = secretManager.classifyKeyRule(leafKey);
    if (rule) {
      return attributeKeyRule(path, 'redact', leafKey, secretManager);
    }
  }

  return { path, action: 'redact', rule: 'default' };
};

export const buildPathRules = (
  before: JsonValue | undefined,
  redactedPaths: readonly string[],
  deletedPaths: readonly string[],
  secretManager: SecretManager,
  manager: CustomObjectManager
): DryRunPathRule[] => [
  ...deletedPaths.map((path) => attributePathRule(before, path, 'delete', secretManager, manager)),
  ...redactedPaths.map((path) => attributePathRule(before, path, 'redact', secretManager, manager))
];