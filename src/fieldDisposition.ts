import { PathRuleMatcher } from './pathRuleMatcher';
import { SecretManager } from './secretManager';

export type FieldDisposition =
  | { action: 'default' }
  | { action: 'skip' }
  | { action: 'remove' }
  | { action: 'opaque' }
  | { action: 'deep' }
  | { action: 'shallow' }
  | { action: 'pass-key-recurse' };

export const resolveFieldDisposition = (
  secretManager: SecretManager,
  pathRuleMatcher: PathRuleMatcher,
  key: string,
  pathSegments: Array<string | number>,
  forceDeepRedaction: boolean
): FieldDisposition => {
  const pathRule = pathRuleMatcher.getMatchingRule([...pathSegments, key]);

  if (pathRule?.mode === 'pass') {
    return { action: 'skip' };
  }

  if (pathRule?.mode === 'remove') {
    return { action: 'remove' };
  }

  if (pathRule?.mode === 'opaque') {
    return { action: 'opaque' };
  }

  if (pathRule?.mode === 'deep') {
    return { action: 'deep' };
  }

  if (pathRule?.mode === 'shallow') {
    return { action: 'shallow' };
  }

  if (forceDeepRedaction && secretManager.isPassKey(key)) {
    return { action: 'pass-key-recurse' };
  }

  return { action: 'default' };
};
