import { CustomObjectMatchType, FieldRedactorConfig } from './types';

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
      deleteSecretKeys: [/authKey/i],
      customObjects: [
        {
          name: CustomObjectMatchType.Ignore,
          type: CustomObjectMatchType.Ignore,
          value: 'name'
        }
      ]
    };
  },

  /**
   * Application log preset from `realExamples.spec.ts`: common PII field patterns,
   * auth key removal, and `{ name, value }` event metadata schemas.
   */
  applicationLogging(): Pick<FieldRedactorConfig, 'secretKeys' | 'deleteSecretKeys' | 'customObjects'> {
    return {
      secretKeys: [/email/i, /mdn/i, /phone/i, /.+name$/i, /auth/i],
      deleteSecretKeys: [/authKey/i],
      customObjects: [
        {
          name: CustomObjectMatchType.Ignore,
          value: 'name'
        }
      ]
    };
  },

  /**
   * `{ key, value }` shaped entries (blanket coverage small schema).
   */
  keyValueEntries(): Pick<FieldRedactorConfig, 'customObjects'> {
    return {
      customObjects: [
        {
          key: CustomObjectMatchType.Ignore,
          value: 'key'
        }
      ]
    };
  }
};
