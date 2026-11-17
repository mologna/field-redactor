import { FieldRedactor } from './fieldRedactor';
import { FieldRedactorConfigurationError } from '../errors';
import {
  appendRegExpArray,
  appendSecretKeyPatterns,
  finalizeRegisteredSchemas,
  mergePartialConfig,
  RegisteredSchema,
  SecretPatternField
} from '../config/redactionRules';
import { assertValidKeyRedactorRules } from '../config/configValidator';
import {
  CustomObject,
  FieldRedactorConfig,
  KeyRedactorRule,
  PathRule,
  PathRuleMode,
  Redactor,
  SyncRedactor
} from '../types';
import { isKeyRedactorRule } from '../rules/redactorBinding';

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
  shallow(...patterns: RegExp[]): this;
  /** Shallow rule with its own transform. Every key in `keys` shares that transform. */
  shallow(rule: KeyRedactorRule): this;
  shallow(...args: Array<RegExp | KeyRedactorRule>): this {
    return this.appendKeyRule('secretKeys', 'shallow', args);
  }

  /** Deep — redact matching keys and descendants (`deepSecretKeys`). */
  deep(...patterns: RegExp[]): this;
  /** Deep rule with its own transform, inherited by descendants that do not set their own. */
  deep(rule: KeyRedactorRule): this;
  deep(...args: Array<RegExp | KeyRedactorRule>): this {
    return this.appendKeyRule('deepSecretKeys', 'deep', args);
  }

  /** Opaque — stringify entire values at matching keys (`opaqueSecretKeys`). */
  opaque(...patterns: RegExp[]): this;
  /** Opaque rule with its own transform, applied to the stringified value. */
  opaque(rule: KeyRedactorRule): this;
  opaque(...args: Array<RegExp | KeyRedactorRule>): this {
    return this.appendKeyRule('opaqueSecretKeys', 'opaque', args);
  }

  /** Remove — delete matching keys from output (`removeSecretKeys`). */
  remove(...patterns: RegExp[]): this {
    appendRegExpArray(this.config, 'removeSecretKeys', patterns);
    return this;
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
   * An optional transform on the rule overrides key-rule and inherited transforms at that path.
   */
  pathRule(path: string, mode: PathRuleMode): this;
  pathRule(rule: PathRule): this;
  pathRule(pathOrRule: string | PathRule, mode?: PathRuleMode): this {
    if (typeof pathOrRule !== 'string') {
      if (!pathOrRule.path || !pathOrRule.mode) {
        throw new FieldRedactorConfigurationError('`pathRule` requires `path` and `mode`.');
      }

      this.config.pathRules = [...(this.config.pathRules ?? []), pathOrRule];
      return this;
    }

    if (!mode) {
      throw new FieldRedactorConfigurationError('`pathRule` requires a mode.');
    }

    this.config.pathRules = [...(this.config.pathRules ?? []), { path: pathOrRule, mode }];
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

  private appendKeyRule(field: SecretPatternField, label: string, args: Array<RegExp | KeyRedactorRule>): this {
    if (args.length === 1 && isKeyRedactorRule(args[0])) {
      assertValidKeyRedactorRules({ [field]: [args[0]] });
      appendSecretKeyPatterns(this.config, field, [args[0]]);
      return this;
    }

    if (args.some((pattern) => !(pattern instanceof RegExp))) {
      throw new FieldRedactorConfigurationError(
        `\`${label}\` accepts regular expressions or a single { keys, redactor?, syncRedactor? } rule.`
      );
    }

    appendSecretKeyPatterns(this.config, field, args as RegExp[]);
    return this;
  }

  private set<K extends keyof FieldRedactorConfig>(key: K, value: FieldRedactorConfig[K]): this {
    this.config[key] = value;
    return this;
  }
}
