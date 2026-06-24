import { CustomObjectMatchType, CustomObject, FieldRedactorConfig } from './types';

const AUTH_KEY_REMOVAL: Pick<FieldRedactorConfig, 'deleteSecretKeys'> = {
  deleteSecretKeys: [/authKey/i]
};

const NAME_VALUE_EVENT_SCHEMA: CustomObject = {
  name: CustomObjectMatchType.Ignore,
  value: 'name'
};

const NAME_TYPE_VALUE_METADATA_SCHEMA: CustomObject = {
  name: CustomObjectMatchType.Ignore,
  type: CustomObjectMatchType.Ignore,
  value: 'name'
};

const KEY_VALUE_ENTRY_SCHEMA: CustomObject = {
  key: CustomObjectMatchType.Ignore,
  value: 'key'
};

const APPLICATION_LOG_SECRET_KEYS = [/email/i, /mdn/i, /phone/i, /.+name$/i, /auth/i];

/**
 * Opinionated configuration presets derived from integration test fixtures.
 * Spread into {@link FieldRedactor} or {@link FieldRedactor.createSafe} config and extend as needed.
 */
export const presets = {
  /**
   * `{ name, type, value }` metadata entries with sibling-key redaction and auth key removal.
   * Pair with your own `secretKeys` for field names that should trigger redaction.
   */
  loggingMetadata(): Pick<FieldRedactorConfig, 'customObjects' | 'deleteSecretKeys'> {
    return {
      ...AUTH_KEY_REMOVAL,
      customObjects: [NAME_TYPE_VALUE_METADATA_SCHEMA]
    };
  },

  /**
   * Application log preset from `realExamples.spec.ts`: common PII field patterns,
   * auth key removal, and `{ name, value }` event metadata schemas.
   */
  applicationLogging(): Pick<FieldRedactorConfig, 'secretKeys' | 'deleteSecretKeys' | 'customObjects'> {
    return {
      secretKeys: APPLICATION_LOG_SECRET_KEYS,
      ...AUTH_KEY_REMOVAL,
      customObjects: [NAME_VALUE_EVENT_SCHEMA]
    };
  },

  /**
   * `{ key, value }` shaped entries (blanket coverage small schema).
   */
  keyValueEntries(): Pick<FieldRedactorConfig, 'customObjects'> {
    return {
      customObjects: [KEY_VALUE_ENTRY_SCHEMA]
    };
  }
};
