import { CustomObject, FieldRedactorConfig } from './types';

export const SECRET_REGEX_FIELDS = ['secretKeys', 'deepSecretKeys', 'fullSecretKeys', 'deleteSecretKeys'] as const;

export type SecretRegexField = (typeof SECRET_REGEX_FIELDS)[number];

export const RULE_LIST_FIELDS = [...SECRET_REGEX_FIELDS, 'customObjects'] as const;

const hasNonEmptyArray = <T>(value: T[] | undefined): value is T[] => value !== undefined && value.length > 0;

export const hasExplicitRedactionRules = (config?: FieldRedactorConfig): boolean =>
  RULE_LIST_FIELDS.some((field) => hasNonEmptyArray(config?.[field] as unknown[] | undefined));

export const appendRegexToConfig = (
  config: FieldRedactorConfig,
  field: SecretRegexField,
  patterns: RegExp[]
): void => {
  config[field] = [...(config[field] ?? []), ...patterns];
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

export const mergePartialConfig = (
  target: FieldRedactorConfig,
  schemas: RegisteredSchema[],
  partial: Partial<FieldRedactorConfig>
): void => {
  for (const field of SECRET_REGEX_FIELDS) {
    const patterns = partial[field];
    if (patterns?.length) {
      appendRegexToConfig(target, field, patterns);
    }
  }

  if (partial.customObjects?.length) {
    for (const object of partial.customObjects) {
      schemas.push({ object });
    }
  }

  for (const field of PRESET_SCALAR_FIELDS) {
    const value = partial[field];
    if (value !== undefined && target[field] === undefined) {
      Object.assign(target, { [field]: value });
    }
  }
};
