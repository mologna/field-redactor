import { formatJsonPath } from '../util/jsonWalk';
import { InPlaceRollback } from '../util/inPlaceRollback';
import {
  KeyRedactorRule,
  PathRule,
  Redactor,
  RedactorContext,
  SecretKeyPattern,
  SecretSpecifierValue,
  SyncRedactor
} from '../types';

/** Transform attached to one key pattern or path rule. Absent functions use the default redactor. */
export type RedactorBinding = {
  redactor?: Redactor;
  syncRedactor?: SyncRedactor;
};

export type KeyPatternEntry = {
  pattern: RegExp;
  binding?: RedactorBinding;
};

/**
 * Path of the value being visited, plus the transform inherited from the nearest
 * opaque or deep ancestor that had one. Schema sibling keys are not path segments,
 * so that ancestor transform is carried here instead of rediscovered from the path.
 */
export type FieldRedactionScope = {
  pathSegments: Array<string | number>;
  inheritedBinding?: RedactorBinding;
  /** Owned by this traversal. Concurrent calls must not share one instance flag. */
  asyncMode: boolean;
  /** Present only for an in-place sync walk that must undo writes if it throws. */
  rollback?: InPlaceRollback;
};

export const rootScope = (asyncMode: boolean, rollback?: InPlaceRollback): FieldRedactionScope => ({
  pathSegments: [],
  asyncMode,
  ...(rollback ? { rollback } : {})
});

export const scopeForKey = (
  parent: FieldRedactionScope,
  key: string | number,
  inheritedBinding?: RedactorBinding
): FieldRedactionScope => ({
  pathSegments: [...parent.pathSegments, key],
  inheritedBinding: inheritedBinding ?? parent.inheritedBinding,
  asyncMode: parent.asyncMode,
  ...(parent.rollback ? { rollback: parent.rollback } : {})
});

export const isKeyRedactorRule = (value: unknown): value is KeyRedactorRule =>
  !!value && typeof value === 'object' && !(value instanceof RegExp) && Array.isArray((value as KeyRedactorRule).keys);

export const bindingFrom = (source: {
  redactor?: Redactor;
  syncRedactor?: SyncRedactor;
}): RedactorBinding | undefined => {
  if (!source.redactor && !source.syncRedactor) {
    return undefined;
  }

  return {
    ...(source.redactor ? { redactor: source.redactor } : {}),
    ...(source.syncRedactor ? { syncRedactor: source.syncRedactor } : {})
  };
};

export const hasBinding = (binding: RedactorBinding | undefined): binding is RedactorBinding =>
  !!binding && (!!binding.redactor || !!binding.syncRedactor);

/** Async function with no sync counterpart. The sync API cannot run this binding. */
export const isAsyncOnlyBinding = (binding: RedactorBinding | undefined): boolean =>
  !!binding?.redactor && !binding.syncRedactor;

export const bindingsMatch = (left: RedactorBinding | undefined, right: RedactorBinding | undefined): boolean =>
  left?.redactor === right?.redactor && left?.syncRedactor === right?.syncRedactor;

export const flattenSecretKeyPatterns = (patterns: SecretKeyPattern[] | undefined): KeyPatternEntry[] | undefined => {
  if (!patterns) {
    return undefined;
  }

  return patterns.flatMap((entry) => {
    if (entry instanceof RegExp) {
      return [{ pattern: entry }];
    }

    const binding = bindingFrom(entry);
    return entry.keys.map((pattern) => (binding ? { pattern, binding } : { pattern }));
  });
};

export const collectRedactorBindings = (
  patternLists: Array<SecretKeyPattern[] | undefined>,
  pathRules: PathRule[] | undefined
): RedactorBinding[] => {
  const bindings: RedactorBinding[] = [];

  for (const list of patternLists) {
    for (const entry of flattenSecretKeyPatterns(list) ?? []) {
      if (entry.binding) {
        bindings.push(entry.binding);
      }
    }
  }

  for (const rule of pathRules ?? []) {
    const binding = bindingFrom(rule);
    if (binding) {
      bindings.push(binding);
    }
  }

  return bindings;
};

export const redactorContextFor = (
  secretKey: SecretSpecifierValue,
  pathSegments: readonly (string | number)[]
): RedactorContext => ({
  key: String(secretKey),
  path: formatJsonPath(pathSegments)
});
