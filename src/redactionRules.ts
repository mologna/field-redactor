import { CustomObject, FieldRedactorConfig } from './types';

export const SECRET_REGEX_FIELDS = ['secretKeys', 'deepSecretKeys', 'fullSecretKeys', 'deleteSecretKeys'] as const;

export const VALUE_PATTERN_FIELDS = ['valuePatterns'] as const;

export const REGEX_ARRAY_CONFIG_FIELDS = [...SECRET_REGEX_FIELDS, ...VALUE_PATTERN_FIELDS] as const;

export type SecretRegexField = (typeof SECRET_REGEX_FIELDS)[number];

export type ValuePatternField = (typeof VALUE_PATTERN_FIELDS)[number];

export type RegexArrayConfigField = (typeof REGEX_ARRAY_CONFIG_FIELDS)[number];

export const RULE_LIST_FIELDS = [...REGEX_ARRAY_CONFIG_FIELDS, 'customObjects'] as const;

const hasNonEmptyArray = <T>(value: T[] | undefined): value is T[] => value !== undefined && value.length > 0;

export const hasExplicitRedactionRules = (config?: FieldRedactorConfig): boolean =>
  RULE_LIST_FIELDS.some((field) => hasNonEmptyArray(config?.[field] as unknown[] | undefined));

/**
 * When only value patterns are configured, shallow key matching must be disabled (`secretKeys: []`)
 * so the legacy default does not redact every field.
 */
export const resolveSecretKeys = (config?: FieldRedactorConfig): RegExp[] | undefined => {
  const { secretKeys, deepSecretKeys, fullSecretKeys, deleteSecretKeys, customObjects, valuePatterns } = config ?? {};

  if (secretKeys !== undefined) {
    return secretKeys;
  }

  if (
    valuePatterns?.length &&
    !deepSecretKeys?.length &&
    !fullSecretKeys?.length &&
    !deleteSecretKeys?.length &&
    !customObjects?.length
  ) {
    return [];
  }

  return undefined;
};

export const appendRegExpArray = <F extends RegexArrayConfigField>(
  config: FieldRedactorConfig,
  field: F,
  patterns: RegExp[]
): void => {
  config[field] = [...(config[field] ?? []), ...patterns];
};

export const appendRegexToConfig = (
  config: FieldRedactorConfig,
  field: SecretRegexField,
  patterns: RegExp[]
): void => {
  appendRegExpArray(config, field, patterns);
};

export type RegisteredSchema = { object: CustomObject; name?: string };

export const finalizeRegisteredSchemas = (
  schemas: RegisteredSchema[]
): Pick<FieldRedactorConfig, 'customObjects' | 'schemaNames'> => {
  if (schemas.length === 0) {
    return {};
  }

  const customObjects = schemas.map((entry) => entry.object);
  const schemaNames = schemas.map((entry) => entry.name);

  return schemaNames.some((name) => name !== undefined) ? { customObjects, schemaNames } : { customObjects };
};

const PRESET_SCALAR_FIELDS = [
  'redactor',
  'syncRedactor',
  'ignoreBooleans',
  'ignoreNullOrUndefined',
  'cloneInput',
  'strict',
  'onConfigWarning'
] as const satisfies ReadonlyArray<keyof FieldRedactorConfig>;

const applyUnsetScalars = (target: FieldRedactorConfig, partial: Partial<FieldRedactorConfig>): void => {
  for (const field of PRESET_SCALAR_FIELDS) {
    const value = partial[field];
    if (value !== undefined && target[field] === undefined) {
      Object.assign(target, { [field]: value });
    }
  }
};

export const mergePartialConfig = (
  target: FieldRedactorConfig,
  schemas: RegisteredSchema[],
  partial: Partial<FieldRedactorConfig>
): void => {
  for (const field of REGEX_ARRAY_CONFIG_FIELDS) {
    if (partial[field]?.length) {
      appendRegExpArray(target, field, partial[field]!);
    }
  }

  partial.customObjects?.forEach((object) => schemas.push({ object }));
  applyUnsetScalars(target, partial);
};
