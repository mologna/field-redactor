import { FieldRedactorConfigurationError } from './errors';
import { CustomObject, FieldRedactorConfig } from './types';

const SECRET_REGEX_FIELDS = ['secretKeys', 'deepSecretKeys', 'fullSecretKeys', 'deleteSecretKeys'] as const;

const RULE_LIST_FIELDS = [...SECRET_REGEX_FIELDS, 'customObjects'] as const;

const regexIdentity = (regex: RegExp): string => `${regex.source}\0${regex.flags}`;

const formatRegex = (regex: RegExp): string => `/${regex.source}/${regex.flags}`;

const hasNonEmptyArray = <T>(value: T[] | undefined): value is T[] => value !== undefined && value.length > 0;

export const hasExplicitRedactionRules = (config?: FieldRedactorConfig): boolean =>
  RULE_LIST_FIELDS.some((field) => hasNonEmptyArray(config?.[field] as unknown[] | undefined));

export const assertNoIdenticalCustomObjectSchemas = (customObjects?: CustomObject[]): void => {
  if (!customObjects || customObjects.length <= 1) {
    return;
  }

  for (let i = 0; i < customObjects.length - 1; i++) {
    const keys = Object.keys(customObjects[i]);
    for (let j = i + 1; j < customObjects.length; j++) {
      const otherKeys = Object.keys(customObjects[j]);
      if (keys.length === otherKeys.length && keys.every((key) => otherKeys.includes(key))) {
        throw new FieldRedactorConfigurationError(
          `Custom Objects at indexes ${i} and ${j} cannot have identical keys: ${keys}`
        );
      }
    }
  }
};

const collectRegexWarnings = (config: FieldRedactorConfig): string[] => {
  const warnings: string[] = [];
  const seen = new Map<string, string>();

  for (const field of SECRET_REGEX_FIELDS) {
    const regexes = config[field];
    if (!regexes) {
      continue;
    }

    for (const regex of regexes) {
      if (regex.global) {
        warnings.push(
          `Global regex ${formatRegex(regex)} in \`${field}\` can produce surprising \`.test()\` results; remove the \`g\` flag.`
        );
      }

      const identity = regexIdentity(regex);
      const prior = seen.get(identity);
      if (prior && prior !== field) {
        warnings.push(
          `${formatRegex(regex)} appears in both \`${prior}\` and \`${field}\` — only the higher-precedence rule applies.`
        );
      } else if (!prior) {
        seen.set(identity, field);
      }
    }
  }

  return warnings;
};

const collectSchemaWarnings = (customObjects: CustomObject[]): string[] => {
  const warnings: string[] = [];

  customObjects.forEach((schema, schemaIndex) => {
    for (const [field, rule] of Object.entries(schema)) {
      if (typeof rule === 'string' && !Object.prototype.hasOwnProperty.call(schema, rule)) {
        warnings.push(
          `Schema at index ${schemaIndex}: field \`${field}: '${rule}'\` references sibling key \`${rule}\` which is not defined in the schema.`
        );
      }
    }
  });

  for (let i = 0; i < customObjects.length - 1; i++) {
    const keysA = Object.keys(customObjects[i]);
    for (let j = i + 1; j < customObjects.length; j++) {
      const keysB = Object.keys(customObjects[j]);
      const aSubsetOfB = keysA.length < keysB.length && keysA.every((key) => keysB.includes(key));
      const bSubsetOfA = keysB.length < keysA.length && keysB.every((key) => keysA.includes(key));
      if (aSubsetOfB || bSubsetOfA) {
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

  const warnings = [
    ...(!hasExplicitRedactionRules(resolved)
      ? ['All values will be redacted. Did you mean to set `secretKeys` or use `FieldRedactor.createSafe()`?']
      : []),
    ...collectRegexWarnings(resolved),
    ...collectSchemaWarnings(resolved.customObjects ?? [])
  ];

  if (resolved.strict && warnings[0]) {
    throw new FieldRedactorConfigurationError(warnings[0]);
  }

  return warnings;
};
