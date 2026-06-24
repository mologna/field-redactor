/** JSON-compatible primitive. */
export type JsonPrimitive = string | number | boolean | null;

/** Function values encountered during traversal are left unchanged. */
export type JsonFunction = (...args: never[]) => unknown;

/** Scalar values that may appear in JSON-like structures during redaction. */
export type JsonLeafValue = JsonPrimitive | Date | JsonFunction;

/** JSON-compatible object. */
export type JsonObject = { [key: string]: JsonValue | undefined };

/** JSON-compatible array. */
export type JsonArray = Array<JsonValue | undefined>;

/** JSON-compatible value. */
export type JsonValue = JsonLeafValue | JsonObject | JsonArray;

/**
 * Values accepted by {@link FieldRedactor.redact} and {@link FieldRedactor.redactInPlace}.
 * Root-level primitives, `Date`, and functions are returned unchanged without traversal.
 */
export type RedactableInput = JsonValue | undefined;

/** Primitive values that may be passed to a custom {@link Redactor} function. */
export type RedactorInput = JsonPrimitive | undefined;

/** Primitive values processed by {@link PrimitiveRedactor}. */
export type RedactablePrimitive = RedactorInput;

/** Result of redacting a primitive value. */
export type RedactedPrimitive = string | boolean | null | undefined | 0;

/**
 * Sibling field value used to resolve secret specifiers in custom object schemas
 * (for example, the string `"email"` in a `{ name, value }` metadata entry).
 */
export type SecretSpecifierValue = string | number | boolean;

export type Redactor = (value: RedactorInput) => Promise<string>;

/** Synchronous redactor for use with {@link FieldRedactor.redactSync} without Promise overhead. */
export type SyncRedactor = (value: RedactorInput) => string;

/**
 * Per-field redaction mode inside a {@link CustomObject} schema.
 * Values align with the top-level doc labels: Shallow, Deep, Opaque (Full), Remove (Delete).
 */
export enum CustomObjectMatchType {
  Delete,
  Full,
  Deep,
  Shallow,
  Pass,
  Ignore
}

export type CustomObject = {
  /**
   * Object schema for **Schema** (`customObjects`) mode.
   * Keys define required fields for matching; input objects may contain additional keys.
   */
  [key: string]: CustomObjectMatchType | string;
};

export type PrimitiveRedactorConfig = {
  redactor?: Redactor;
  syncRedactor?: SyncRedactor;
  ignoreBooleans: boolean;
  ignoreNullOrUndefined: boolean;
};

export type SecretManagerConfig = {
  /** Shallow — redact matching keys' scalar values only (`secretKeys`). */
  secretKeys?: RegExp[];
  /** Deep — redact matching keys and all descendant primitives (`deepSecretKeys`). */
  deepSecretKeys?: RegExp[];
  /** Opaque — stringify entire value at matching keys, then redact (`fullSecretKeys`). */
  fullSecretKeys?: RegExp[];
  /** Remove — delete matching keys from output (`deleteSecretKeys`). */
  deleteSecretKeys?: RegExp[];
};

export type FieldRedactorConfig = Partial<PrimitiveRedactorConfig> &
  SecretManagerConfig & {
    redactor?: Redactor;
    syncRedactor?: SyncRedactor;
    /** Schema rules for shaped objects (`customObjects`). */
    customObjects?: CustomObject[];
    /**
     * When true (default), `redact()` and `redactSync()` leave the input untouched using copy-on-write
     * structural sharing. When false, those methods mutate the input in place (equivalent to `redactInPlace`).
     */
    cloneInput?: boolean;
    /**
     * When true, configuration warnings throw {@link FieldRedactorConfigurationError} at construction time.
     * When false (default), warnings are exposed via {@link FieldRedactor.configWarnings} and `onConfigWarning`.
     */
    strict?: boolean;
    /** Called for each non-fatal configuration warning when `strict` is false. */
    onConfigWarning?: (message: string) => void;
    /**
     * Optional labels parallel to `customObjects` (same index). Used in {@link FieldRedactor.dryRun} reports.
     * Set via {@link FieldRedactorConfigBuilder.schema}.
     */
    schemaNames?: (string | undefined)[];
  };

export type MatchedSchemaReport = {
  path: string;
  schemaIndex: number;
  schemaName?: string;
};

export type DryRunReport = {
  redactedPaths: string[];
  deletedPaths: string[];
  matchedSchemas: MatchedSchemaReport[];
};

export type DryRunResult<T> = {
  result: T;
  report: DryRunReport;
};

/** JSON object or array traversed during in-place redaction. */
export type TraversableJson = JsonObject | JsonArray;

/** Mutable key/value map used while traversing JSON object or array keys in place. */
export type JsonRecord = Record<string, JsonValue | undefined>;

export const isJsonObject = (value: JsonValue | undefined): value is JsonObject =>
  !!value && typeof value === 'object' && !(value instanceof Date) && !Array.isArray(value);
