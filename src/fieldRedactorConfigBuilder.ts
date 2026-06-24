import { FieldRedactor } from './fieldRedactor';
import { CustomObject, FieldRedactorConfig, Redactor, SyncRedactor } from './types';

export type SchemaOptions = {
  /** Optional label surfaced in {@link FieldRedactor.dryRun} `matchedSchemas` reports. */
  name?: string;
};

type RegexConfigField = 'secretKeys' | 'deepSecretKeys' | 'fullSecretKeys' | 'deleteSecretKeys';

/**
 * Fluent builder for {@link FieldRedactorConfig} using doc labels (Shallow, Deep, Opaque, Remove, Schema).
 */
export class FieldRedactorConfigBuilder {
  private config: FieldRedactorConfig = {};
  private schemaNames: (string | undefined)[] = [];

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
    this.config.customObjects = [...(this.config.customObjects ?? []), customObject];
    this.schemaNames.push(options?.name);
    return this;
  }

  redactor(fn: Redactor): this {
    this.config.redactor = fn;
    return this;
  }

  syncRedactor(fn: SyncRedactor): this {
    this.config.syncRedactor = fn;
    return this;
  }

  ignoreBooleans(value: boolean): this {
    this.config.ignoreBooleans = value;
    return this;
  }

  ignoreNullOrUndefined(value: boolean): this {
    this.config.ignoreNullOrUndefined = value;
    return this;
  }

  cloneInput(value: boolean): this {
    this.config.cloneInput = value;
    return this;
  }

  strict(value = true): this {
    this.config.strict = value;
    return this;
  }

  onConfigWarning(handler: (message: string) => void): this {
    this.config.onConfigWarning = handler;
    return this;
  }

  build(): FieldRedactorConfig {
    const config = { ...this.config };
    if (this.schemaNames.some((name) => name !== undefined)) {
      config.schemaNames = this.schemaNames;
    }
    return config;
  }

  buildRedactor(): FieldRedactor {
    return new FieldRedactor(this.build());
  }

  buildSafeRedactor(): FieldRedactor {
    return FieldRedactor.createSafe(this.build());
  }

  private appendRegex(field: RegexConfigField, patterns: RegExp[]): this {
    this.config[field] = [...(this.config[field] ?? []), ...patterns];
    return this;
  }
}
