import { FieldRedactorConfigurationError } from './errors';
import { CustomObject, CustomObjectMatchType, FieldRedactorConfig } from './types';

const SECRET_KEY_GROUPS: Array<{ label: string; key: keyof FieldRedactorConfig }> = [
  { label: 'secretKeys', key: 'secretKeys' },
  { label: 'deepSecretKeys', key: 'deepSecretKeys' },
  { label: 'fullSecretKeys', key: 'fullSecretKeys' },
  { label: 'deleteSecretKeys', key: 'deleteSecretKeys' }
];

const regexIdentity = (regex: RegExp): string => `${regex.source}\0${regex.flags}`;

const formatRegex = (regex: RegExp): string => `/${regex.source}/${regex.flags}`;

const hasNonEmptyArray = <T>(value: T[] | undefined): value is T[] => value !== undefined && value.length > 0;

export const hasExplicitRedactionRules = (config?: FieldRedactorConfig): boolean =>
  hasNonEmptyArray(config?.secretKeys) ||
  hasNonEmptyArray(config?.deepSecretKeys) ||
  hasNonEmptyArray(config?.fullSecretKeys) ||
  hasNonEmptyArray(config?.deleteSecretKeys) ||
  hasNonEmptyArray(config?.customObjects);

const isSiblingKeyReference = (value: CustomObjectMatchType | string): value is string =>
  typeof value === 'string';

export const assertNoIdenticalCustomObjectSchemas = (customObjects?: CustomObject[]): void => {
  if (!customObjects || customObjects.length <= 1) {
    return;
  }

  for (let i = 0; i < customObjects.length - 1; i++) {
    const current = customObjects[i];
    const keys = Object.keys(current);
    for (let j = i + 1; j < customObjects.length; j++) {
      const other = customObjects[j];
      const otherKeys = Object.keys(other);
      const commonKeys = keys.filter((key) => otherKeys.includes(key));
      if (commonKeys.length === keys.length && commonKeys.length === otherKeys.length) {
        throw new FieldRedactorConfigurationError(
          `Custom Objects at indexes ${i} and ${j} cannot have identical keys: ${commonKeys}`
        );
      }
    }
  }
};

const collectDuplicateRegexWarnings = (config: FieldRedactorConfig): string[] => {
  const warnings: string[] = [];
  const seen = new Map<string, string>();

  for (const { label, key } of SECRET_KEY_GROUPS) {
    const regexes = config[key] as RegExp[] | undefined;
    if (!regexes) {
      continue;
    }

    for (const regex of regexes) {
      const identity = regexIdentity(regex);
      const prior = seen.get(identity);
      if (prior && prior !== label) {
        warnings.push(
          `${formatRegex(regex)} appears in both \`${prior}\` and \`${label}\` — only the higher-precedence rule applies.`
        );
      } else if (!prior) {
        seen.set(identity, label);
      }
    }
  }

  return warnings;
};

const collectGlobalRegexWarnings = (config: FieldRedactorConfig): string[] => {
  const warnings: string[] = [];

  for (const { label, key } of SECRET_KEY_GROUPS) {
    const regexes = config[key] as RegExp[] | undefined;
    if (!regexes) {
      continue;
    }

    for (const regex of regexes) {
      if (regex.global) {
        warnings.push(
          `Global regex ${formatRegex(regex)} in \`${label}\` can produce surprising \`.test()\` results; remove the \`g\` flag.`
        );
      }
    }
  }

  return warnings;
};

const collectMissingSiblingKeyWarnings = (customObjects: CustomObject[]): string[] => {
  const warnings: string[] = [];

  customObjects.forEach((schema, schemaIndex) => {
    for (const [field, rule] of Object.entries(schema)) {
      if (isSiblingKeyReference(rule) && !Object.prototype.hasOwnProperty.call(schema, rule)) {
        warnings.push(
          `Schema at index ${schemaIndex}: field \`${field}: '${rule}'\` references sibling key \`${rule}\` which is not defined in the schema.`
        );
      }
    }
  });

  return warnings;
};

const schemaKeys = (schema: CustomObject): string[] => Object.keys(schema);

const isSubsetSchema = (subset: string[], superset: string[]): boolean =>
  subset.length < superset.length && subset.every((key) => superset.includes(key));

const collectOverlappingSchemaWarnings = (customObjects: CustomObject[]): string[] => {
  const warnings: string[] = [];

  for (let i = 0; i < customObjects.length - 1; i++) {
    const keysA = schemaKeys(customObjects[i]);
    for (let j = i + 1; j < customObjects.length; j++) {
      const keysB = schemaKeys(customObjects[j]);
      if (isSubsetSchema(keysA, keysB) || isSubsetSchema(keysB, keysA)) {
        warnings.push(
          `Schemas at index ${i} and ${j} may both match the same object; index ${keysB.length > keysA.length ? j : i} wins only when it has more keys.`
        );
      }
    }
  }

  return warnings;
};

/**
 * Returns non-fatal configuration warnings. Throws {@link FieldRedactorConfigurationError} for
 * invalid custom object duplicates and when `strict` is true on any warning.
 */
export const validateFieldRedactorConfig = (config?: FieldRedactorConfig): string[] => {
  const resolved = config ?? {};
  assertNoIdenticalCustomObjectSchemas(resolved.customObjects);

  const warnings: string[] = [];

  if (!hasExplicitRedactionRules(resolved)) {
    warnings.push('All values will be redacted. Did you mean to set `secretKeys` or use `FieldRedactor.createSafe()`?');
  }

  warnings.push(
    ...collectDuplicateRegexWarnings(resolved),
    ...collectGlobalRegexWarnings(resolved),
    ...collectMissingSiblingKeyWarnings(resolved.customObjects ?? []),
    ...collectOverlappingSchemaWarnings(resolved.customObjects ?? [])
  );

  if (resolved.strict) {
    const first = warnings[0];
    if (first) {
      throw new FieldRedactorConfigurationError(first);
    }
  }

  return warnings;
};
