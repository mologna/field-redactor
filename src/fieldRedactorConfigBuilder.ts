import { FieldRedactor } from './fieldRedactor';
import {
  appendRegexToConfig,
  finalizeRegisteredSchemas,
  mergePartialConfig,
  RegisteredSchema,
  SecretRegexField
} from './redactionRules';
import { CustomObject, FieldRedactorConfig, Redactor, SyncRedactor } from './types';

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

  /** Opaque — stringify entire values at matching keys (`fullSecretKeys`). */
  opaque(...patterns: RegExp[]): this {
    return this.appendRegex('fullSecretKeys', patterns);
  }

  /** Remove — delete matching keys from output (`deleteSecretKeys`). */
  remove(...patterns: RegExp[]): this {
    return this.appendRegex('deleteSecretKeys', patterns);
  }

  /** Alias for {@link FieldRedactorConfigBuilder.remove}. */
  delete(...patterns: RegExp[]): this {
    return this.remove(...patterns);
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
    this.config.valuePatterns = [...(this.config.valuePatterns ?? []), ...patterns];
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

  buildRedactor(): FieldRedactor {
    return new FieldRedactor(this.build());
  }

  buildSafeRedactor(): FieldRedactor {
    return FieldRedactor.createSafe(this.build());
  }

  private appendRegex(field: SecretRegexField, patterns: RegExp[]): this {
    appendRegexToConfig(this.config, field, patterns);
    return this;
  }

  private set<K extends keyof FieldRedactorConfig>(key: K, value: FieldRedactorConfig[K]): this {
    this.config[key] = value;
    return this;
  }
}
