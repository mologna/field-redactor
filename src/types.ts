/** JSON-compatible primitive. Useful when typing redactor inputs and report values. */
export type JsonPrimitive = string | number | boolean | null;

/**
 * Function values encountered during traversal are left unchanged.
 * @internal Primarily for engine typing; consumers rarely need this directly.
 */
export type JsonFunction = (...args: never[]) => unknown;

/**
 * Scalar values that may appear in JSON-like structures during redaction.
 * @internal Prefer {@link JsonPrimitive} or {@link JsonValue} in application code.
 */
export type JsonLeafValue = JsonPrimitive | Date | JsonFunction;

/** JSON-compatible object. Useful when typing nested payloads. */
export type JsonObject = { [key: string]: JsonValue | undefined };

/** JSON-compatible array. */
export type JsonArray = Array<JsonValue | undefined>;

/** JSON-compatible value. Useful when typing redactor inputs. */
export type JsonValue = JsonLeafValue | JsonObject | JsonArray;

/**
 * Values accepted by {@link FieldRedactor.redact} and {@link FieldRedactor.redactInPlace}.
 * Root-level primitives, `Date`, and functions are returned unchanged without traversal.
 */
export type RedactableInput = JsonValue | undefined;

/** Primitive values that may be passed to a custom {@link Redactor} function. */
export type RedactorInput = JsonPrimitive | undefined;

/**
 * Primitive values processed by {@link PrimitiveRedactor}.
 * @internal Alias of {@link RedactorInput}; prefer RedactorInput in application code.
 */
export type RedactablePrimitive = RedactorInput;

/**
 * Result of redacting a primitive value.
 * @internal Engine typing detail; prefer `string` for custom redactor return types.
 */
export type RedactedPrimitive = string | boolean | null | undefined | 0;

/**
 * Sibling field value used to resolve secret specifiers in custom object schemas
 * (for example, the string `"email"` in a `{ name, value }` metadata entry).
 * @internal Prefer string | number | boolean in application schemas.
 */
export type SecretSpecifierValue = string | number | boolean;

export type Redactor = (value: RedactorInput) => Promise<string>;

/** Synchronous redactor for use with {@link FieldRedactor.redactSync} without Promise overhead. */
export type SyncRedactor = (value: RedactorInput) => string;

/**
 * Per-field redaction mode inside a {@link CustomObject} schema.
 * Prefer {@link CustomObjectMatchType.Opaque} / {@link CustomObjectMatchType.Remove}
 * over the legacy Full / Delete names (same numeric values).
 */
export enum CustomObjectMatchType {
  /** Remove — delete the field from output. */
  Remove = 0,
  /** @deprecated Prefer {@link CustomObjectMatchType.Remove}. */
  Delete = 0,
  /** Opaque — stringify the entire value, then redact. */
  Opaque = 1,
  /** @deprecated Prefer {@link CustomObjectMatchType.Opaque}. */
  Full = 1,
  Deep = 2,
  Shallow = 3,
  Pass = 4,
  Ignore = 5
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
  /** Opaque — stringify entire value at matching keys, then redact. */
  opaqueSecretKeys?: RegExp[];
  /**
   * @deprecated Prefer {@link SecretManagerConfig.opaqueSecretKeys}.
   * Still accepted and merged into opaqueSecretKeys during construction / normalize.
   */
  fullSecretKeys?: RegExp[];
  /** Remove — delete matching keys from output. */
  removeSecretKeys?: RegExp[];
  /**
   * @deprecated Prefer {@link SecretManagerConfig.removeSecretKeys}.
   * Still accepted and merged into removeSecretKeys during construction / normalize.
   */
  deleteSecretKeys?: RegExp[];
  /**
   * Allowlist — matching key names are never redacted, even under deep or opaque parents (`passKeys`).
   */
  passKeys?: RegExp[];
};

/** Canonical redaction modes shared by path rules, disposition, and dry-run labels. */
export type RedactionMode = 'shallow' | 'deep' | 'opaque' | 'remove';

export type PathRuleMode = RedactionMode | 'pass';

export type PathRule = {
  /** JSON path pattern with `.` segments, `[index]` arrays, and `*` single-segment wildcards. */
  path: string;
  mode: PathRuleMode;
};

export type PathRuleConfig = {
  /**
   * Path-based rules apply a redaction mode at an exact JSON path (for example `metadata.*.value`).
   * Precedence: schema → path rule → key-regex rules → value patterns.
   */
  pathRules?: PathRule[];
};

export type ValuePatternConfig = {
  /**
   * Opt-in value-pattern redaction: redact scalar fields whose **string form** matches a pattern,
   * regardless of key name. Lowest precedence — runs only when key-based rules leave the value unchanged.
   */
  valuePatterns?: RegExp[];
};

export type FieldRedactorConfig = Partial<PrimitiveRedactorConfig> &
  SecretManagerConfig &
  ValuePatternConfig &
  PathRuleConfig & {
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

export type RedactionRuleLabel = 'schema' | RedactionMode | 'value' | 'default';

export type DryRunPathRule = {
  path: string;
  action: 'redact' | 'delete';
  rule: RedactionRuleLabel;
  pattern?: string;
  schemaIndex?: number;
  schemaName?: string;
};

export type DryRunReport = {
  redactedPaths: string[];
  deletedPaths: string[];
  matchedSchemas: MatchedSchemaReport[];
  /** Per-path rule attribution for redacted and deleted paths. */
  pathRules: DryRunPathRule[];
};

export type DryRunResult<T> = {
  result: T;
  report: DryRunReport;
};

/** JSON object or array traversed during in-place redaction.
 * @internal Engine typing; prefer {@link JsonObject} / {@link JsonArray} / {@link RedactableInput}.
 */
export type TraversableJson = JsonObject | JsonArray;

/**
 * Mutable key/value map used while traversing JSON object or array keys in place.
 * @internal Not part of the supported public API.
 */
export type JsonRecord = Record<string, JsonValue | undefined>;

export const isJsonObject = (value: JsonValue | undefined): value is JsonObject =>
  !!value && typeof value === 'object' && !(value instanceof Date) && !Array.isArray(value);
