import { CustomObjectManager } from './customObjectManager';
import { getStringSpecifiedCustomObjectSecretKeyValueIfExists } from './schemaSiblingKey';
import { getJsonValueAtPath, getParentContext } from '../util/jsonWalk';
import { parseJsonPath } from '../util/pathParsing';
import { toRedactablePrimitive } from '../util/primitiveCoercion';
import { PathRuleMatcher } from './pathRuleMatcher';
import { KeyRule, SecretManager } from './secretManager';
import { ValuePatternMatcher } from './valuePatternMatcher';
import {
  CustomObject,
  DryRunPathRule,
  isJsonObject,
  JsonLeafValue,
  JsonValue,
  PathRule,
  PathRuleMode,
  RedactionRuleLabel,
  SecretSpecifierValue
} from '../types';

export type { KeyRule } from './secretManager';

export type FieldDisposition =
  | { action: 'default' }
  | { action: 'skip' }
  | { action: 'remove' }
  | { action: 'opaque' }
  | { action: 'deep' }
  | { action: 'shallow' }
  | { action: 'pass-key-recurse' };

type AttributionContext = {
  before: JsonValue | undefined;
  path: string;
  segments: Array<string | number>;
  objectKeys: string[];
};

const PATH_MODE_TO_DISPOSITION: Record<PathRuleMode, FieldDisposition> = {
  pass: { action: 'skip' },
  remove: { action: 'remove' },
  opaque: { action: 'opaque' },
  deep: { action: 'deep' },
  shallow: { action: 'shallow' }
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

/** Shared path-rule + pass-key disposition used during traversal. */
export const resolvePathDisposition = (
  secretManager: SecretManager,
  pathRuleMatcher: PathRuleMatcher,
  key: string,
  pathSegments: Array<string | number>,
  forceDeepRedaction: boolean
): FieldDisposition => {
  const pathRule = pathRuleMatcher.getMatchingRule([...pathSegments, key]);
  if (pathRule) {
    return PATH_MODE_TO_DISPOSITION[pathRule.mode];
  }

  if (forceDeepRedaction && secretManager.isPassKey(key)) {
    return { action: 'pass-key-recurse' };
  }

  return { action: 'default' };
};

/**
 * Single source of truth for field-level rule precedence shared by traversal and dry-run attribution.
 * Precedence: Schema → path rule → Opaque → Deep → Remove → Shallow → Value-pattern → default
 * (enclosing opaque/deep keys apply before the leaf key rule).
 */
export class RuleResolver {
  constructor(
    private readonly secretManager: SecretManager,
    private readonly pathRuleMatcher: PathRuleMatcher,
    private readonly valuePatternMatcher: ValuePatternMatcher,
    private readonly customObjectManager: CustomObjectManager
  ) {}

  resolvePathDisposition(
    pathSegments: Array<string | number>,
    key: string,
    forceDeepRedaction: boolean
  ): FieldDisposition {
    return resolvePathDisposition(this.secretManager, this.pathRuleMatcher, key, pathSegments, forceDeepRedaction);
  }

  getMatchingPathRule(segments: Array<string | number>): PathRule | undefined {
    const match = this.pathRuleMatcher.getMatchingRule(segments);
    return match?.mode === 'pass' ? undefined : match;
  }

  shouldRemoveByKey(key: SecretSpecifierValue): boolean {
    return this.secretManager.isRemoveSecretKey(key);
  }

  shouldOpaqueByKey(key: SecretSpecifierValue): boolean {
    return this.secretManager.isOpaqueSecretKey(key);
  }

  shouldTraverseContainerByKey(key: SecretSpecifierValue, forceDeepRedaction: boolean): boolean {
    return (
      this.secretManager.isSecretKey(key) ||
      this.secretManager.isDeepSecretKey(key) ||
      forceDeepRedaction
    );
  }

  /** True when the key itself is deep, or an ancestor already forced deep redaction. */
  forceDeepForKey(key: SecretSpecifierValue, forceDeepRedaction: boolean): boolean {
    return forceDeepRedaction || this.secretManager.isDeepSecretKey(key);
  }

  attributeKeyRule(
    path: string,
    action: DryRunPathRule['action'],
    key: SecretSpecifierValue
  ): DryRunPathRule {
    const rule = this.secretManager.classifyKeyRule(key) ?? 'default';
    if (rule === 'default') {
      return toPathRule(path, action, rule);
    }

    return toPathRule(path, action, rule, { pattern: patternForKey(this.secretManager, key, rule) });
  }

  findEnclosingOpaqueOrDeepKey(objectKeys: string[]): { key: string; rule: 'opaque' | 'deep' } | undefined {
    for (let index = objectKeys.length - 2; index >= 0; index--) {
      const key = objectKeys[index];
      const rule = this.secretManager.classifyKeyRule(key);
      if (rule === 'opaque' || rule === 'deep') {
        return { key, rule };
      }
    }

    return undefined;
  }

  resolveSchemaAttribution(context: AttributionContext): DryRunPathRule | undefined {
    const { parent, leaf } = getParentContext(context.before, context.segments);
    if (!isJsonObject(parent) || typeof leaf !== 'string') {
      return undefined;
    }

    const schema = this.customObjectManager.getMatchingCustomObject(parent);
    if (!schema || !(leaf in schema)) {
      return undefined;
    }

    let pattern: string | undefined;
    if (typeof schema[leaf] === 'string') {
      const siblingSpecifier = getStringSpecifiedCustomObjectSecretKeyValueIfExists(parent, schema, leaf);
      if (siblingSpecifier !== undefined) {
        const siblingRule = this.secretManager.classifyKeyRule(siblingSpecifier);
        if (siblingRule && siblingRule !== 'default') {
          pattern = patternForKey(this.secretManager, siblingSpecifier, siblingRule);
        }
      }
    }

    return toPathRule(context.path, 'redact', 'schema', {
      ...this.customObjectManager.getSchemaMetadata(schema),
      ...(pattern ? { pattern } : {})
    });
  }

  resolvePathRuleAttribution(context: AttributionContext): DryRunPathRule | undefined {
    const match = this.getMatchingPathRule(context.segments);
    if (!match) {
      return undefined;
    }

    if (match.mode === 'remove') {
      return toPathRule(context.path, 'remove', 'remove', { pattern: match.path });
    }

    return toPathRule(context.path, 'redact', match.mode as 'shallow' | 'deep' | 'opaque', { pattern: match.path });
  }

  resolveEnclosingKeyAttribution(context: AttributionContext): DryRunPathRule | undefined {
    const enclosing = this.findEnclosingOpaqueOrDeepKey(context.objectKeys);
    if (!enclosing) {
      return undefined;
    }

    return toPathRule(context.path, 'redact', enclosing.rule, {
      pattern: patternForKey(this.secretManager, enclosing.key, enclosing.rule)
    });
  }

  resolveLeafKeyAttribution(context: AttributionContext): DryRunPathRule | undefined {
    const leafKey = context.objectKeys.at(-1);
    if (!leafKey || !this.secretManager.classifyKeyRule(leafKey)) {
      return undefined;
    }

    return this.attributeKeyRule(context.path, 'redact', leafKey);
  }

  resolveValuePatternAttribution(context: AttributionContext): DryRunPathRule | undefined {
    const value = getJsonValueAtPath(context.before, context.segments);
    if (value === undefined || (typeof value !== 'string' && typeof value !== 'number')) {
      return undefined;
    }

    const match = this.valuePatternMatcher.findMatching(toRedactablePrimitive(value as JsonLeafValue));
    if (!match) {
      return undefined;
    }

    return toPathRule(context.path, 'redact', 'value', {
      pattern: this.valuePatternMatcher.formatPattern(match)
    });
  }

  attributeRedactPath(before: JsonValue | undefined, path: string): DryRunPathRule {
    const segments = parseJsonPath(path);
    const context: AttributionContext = {
      before,
      path,
      segments,
      objectKeys: objectKeysFromPath(segments)
    };

    const resolvers = [
      () => this.resolveSchemaAttribution(context),
      () => this.resolvePathRuleAttribution(context),
      () => this.resolveEnclosingKeyAttribution(context),
      () => this.resolveLeafKeyAttribution(context),
      () => this.resolveValuePatternAttribution(context)
    ] as const;

    for (const resolve of resolvers) {
      const rule = resolve();
      if (rule) {
        return rule;
      }
    }

    return toPathRule(path, 'redact', 'default');
  }

  attributeRemovePath(before: JsonValue | undefined, path: string): DryRunPathRule {
    const segments = parseJsonPath(path);
    const pathRule = this.getMatchingPathRule(segments);
    if (pathRule?.mode === 'remove') {
      return toPathRule(path, 'remove', 'remove', { pattern: pathRule.path });
    }

    const removeKey = objectKeysFromPath(segments).at(-1);
    if (removeKey) {
      return this.attributeKeyRule(path, 'remove', removeKey);
    }

    return toPathRule(path, 'remove', 'default');
  }

  /** Returns the matching schema when a shaped object should be handled at this node. */
  getMatchingSchema(value: JsonValue): CustomObject | undefined {
    return isJsonObject(value) ? this.customObjectManager.getMatchingCustomObject(value) : undefined;
  }
}

export const buildPathRules = (
  before: JsonValue | undefined,
  redactedPaths: readonly string[],
  removedPaths: readonly string[],
  resolver: RuleResolver
): DryRunPathRule[] => [
  ...removedPaths.map((path) => resolver.attributeRemovePath(before, path)),
  ...redactedPaths.map((path) => resolver.attributeRedactPath(before, path))
];
