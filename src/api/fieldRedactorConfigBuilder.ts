import { FieldRedactor } from './fieldRedactor';
import {
  appendRegExpArray,
  finalizeRegisteredSchemas,
  mergePartialConfig,
  RegisteredSchema,
  SecretRegexField
} from '../config/redactionRules';
import { CustomObject, FieldRedactorConfig, PathRuleMode, Redactor, SyncRedactor } from '../types';

export type SchemaOptions = {
  /** Optional label surfaced in {@link FieldRedactor.dryRun} `matchedSchemas` reports. */
  name?: string;
};

/**
 * Fluent builder for {@link FieldRedactorConfig} using doc labels (Shallow, Deep, Opaque, Remove, Schema).
 */
export class FieldRedactorConfigBuilder {
  private config: FieldRedactorConfig = {};
  private schemas: RegisteredSchema[] = [];

  static create(): FieldRedactorConfigBuilder {
    return new FieldRedactorConfigBuilder();
  }

  /** Shallow — redact matching keys' scalar values (`secretKeys`). */
  shallow(...patterns: RegExp[]): this {
    return this.appendRegex('secretKeys', patterns);
  }

  /** Deep — redact matching keys and descendants (`deepSecretKeys`). */
  deep(...patterns: RegExp[]): this {
    return this.appendRegex('deepSecretKeys', patterns);
  }

  /** Opaque — stringify entire values at matching keys (`opaqueSecretKeys`). */
  opaque(...patterns: RegExp[]): this {
    return this.appendRegex('opaqueSecretKeys', patterns);
  }

  /** Remove — delete matching keys from output (`removeSecretKeys`). */
  remove(...patterns: RegExp[]): this {
    return this.appendRegex('removeSecretKeys', patterns);
  }

  /** Register an object schema (`customObjects`). */
  schema(customObject: CustomObject, options?: SchemaOptions): this {
    this.schemas.push({ object: customObject, name: options?.name });
    return this;
  }

  /**
   * Value-pattern — redact scalar fields whose string form matches a pattern, regardless of key name (`valuePatterns`).
   * Lowest precedence; opt-in defense in depth beyond key-name rules.
   */
  valuePattern(...patterns: RegExp[]): this {
    appendRegExpArray(this.config, 'valuePatterns', patterns);
    return this;
  }

  /**
   * Path rule — apply a redaction mode at a JSON path (`metadata.*.value`, `accountInfo.id`).
   */
  pathRule(path: string, mode: PathRuleMode): this {
    this.config.pathRules = [...(this.config.pathRules ?? []), { path, mode }];
    return this;
  }

  /** Allowlist — matching key names are never redacted under deep parents (`passKeys`). */
  passKey(...patterns: RegExp[]): this {
    appendRegExpArray(this.config, 'passKeys', patterns);
    return this;
  }

  /**
   * Merge a {@link presets} return value (or any partial config) into the builder.
   * Regex arrays and schemas accumulate; scalar options apply only when not already set.
   */
  usePreset(preset: Partial<FieldRedactorConfig>): this {
    mergePartialConfig(this.config, this.schemas, preset);
    return this;
  }

  redactor(fn: Redactor): this {
    return this.set('redactor', fn);
  }

  syncRedactor(fn: SyncRedactor): this {
    return this.set('syncRedactor', fn);
  }

  ignoreBooleans(value: boolean): this {
    return this.set('ignoreBooleans', value);
  }

  ignoreNullOrUndefined(value: boolean): this {
    return this.set('ignoreNullOrUndefined', value);
  }

  cloneInput(value: boolean): this {
    return this.set('cloneInput', value);
  }

  strict(value = true): this {
    return this.set('strict', value);
  }

  onConfigWarning(handler: (message: string) => void): this {
    return this.set('onConfigWarning', handler);
  }

  build(): FieldRedactorConfig {
    return { ...this.config, ...finalizeRegisteredSchemas(this.schemas) };
  }

  /** Like {@link FieldRedactor} / {@link FieldRedactor.createSafe} using the built config. */
  buildRedactor(): FieldRedactor {
    return new FieldRedactor(this.build());
  }

  /** Alias of {@link FieldRedactorConfigBuilder.buildRedactor}. */
  buildSafeRedactor(): FieldRedactor {
    return this.buildRedactor();
  }

  private appendRegex(field: SecretRegexField, patterns: RegExp[]): this {
    appendRegExpArray(this.config, field, patterns);
    return this;
  }

  private set<K extends keyof FieldRedactorConfig>(key: K, value: FieldRedactorConfig[K]): this {
    this.config[key] = value;
    return this;
  }
}
