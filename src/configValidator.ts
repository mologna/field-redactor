import { FieldRedactorConfigurationError } from './errors';
import { formatRegExp, regexIdentity } from './regexUtils';
import { hasExplicitRedactionRules, REGEX_ARRAY_CONFIG_FIELDS, SECRET_REGEX_FIELDS } from './redactionRules';
import { CustomObject, FieldRedactorConfig } from './types';

export { hasExplicitRedactionRules } from './redactionRules';

const KEY_RULE_FIELDS = new Set<string>(SECRET_REGEX_FIELDS);

const analyzeSchemaPairs = (
  customObjects: CustomObject[]
): { identicalPairs: Array<[number, number, string[]]>; subsetPairs: Array<[number, number]> } => {
  const identicalPairs: Array<[number, number, string[]]> = [];
  const subsetPairs: Array<[number, number]> = [];

  for (let i = 0; i < customObjects.length - 1; i++) {
    const keysA = Object.keys(customObjects[i]);
    for (let j = i + 1; j < customObjects.length; j++) {
      const keysB = Object.keys(customObjects[j]);
      if (keysA.length === keysB.length && keysA.every((key) => keysB.includes(key))) {
        identicalPairs.push([i, j, keysA]);
        continue;
      }

      const aSubsetOfB = keysA.length < keysB.length && keysA.every((key) => keysB.includes(key));
      const bSubsetOfA = keysB.length < keysA.length && keysB.every((key) => keysA.includes(key));
      if (aSubsetOfB || bSubsetOfA) {
        subsetPairs.push([i, j]);
      }
    }
  }

  return { identicalPairs, subsetPairs };
};

export const assertNoIdenticalCustomObjectSchemas = (customObjects?: CustomObject[]): void => {
  if (!customObjects || customObjects.length <= 1) {
    return;
  }

  for (const [i, j, keys] of analyzeSchemaPairs(customObjects).identicalPairs) {
    throw new FieldRedactorConfigurationError(
      `Custom Objects at indexes ${i} and ${j} cannot have identical keys: ${keys}`
    );
  }
};

const collectRegexWarnings = (config: FieldRedactorConfig): string[] => {
  const warnings: string[] = [];
  const keyRuleDuplicates = new Map<string, string>();

  for (const field of REGEX_ARRAY_CONFIG_FIELDS) {
    const regexes = config[field];
    if (!regexes) {
      continue;
    }

    for (const regex of regexes) {
      if (regex.global) {
        warnings.push(
          `Global regex ${formatRegExp(regex)} in \`${field}\` can produce surprising \`.test()\` results; remove the \`g\` flag.`
        );
      }

      if (!KEY_RULE_FIELDS.has(field)) {
        continue;
      }

      const identity = regexIdentity(regex);
      const prior = keyRuleDuplicates.get(identity);
      if (prior && prior !== field) {
        warnings.push(
          `${formatRegExp(regex)} appears in both \`${prior}\` and \`${field}\` — only the higher-precedence rule applies.`
        );
      } else if (!prior) {
        keyRuleDuplicates.set(identity, field);
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

  for (const [i, j] of analyzeSchemaPairs(customObjects).subsetPairs) {
    const keysA = Object.keys(customObjects[i]);
    const keysB = Object.keys(customObjects[j]);
    warnings.push(
      `Schemas at index ${i} and ${j} may both match the same object; index ${keysB.length > keysA.length ? j : i} wins only when it has more keys.`
    );
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
