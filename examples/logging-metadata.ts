/**
 * Logging metadata: `{ name, type, value }` schemas + auth key removal.
 */
import { FieldRedactor, FieldRedactorConfigBuilder, presets } from '../src';

const redactor = FieldRedactorConfigBuilder.create()
  .usePreset(presets.applicationLogging())
  .buildSafeRedactor();

const input = {
  email: 'alice@example.com',
  authKey: 'secret-token',
  events: [{ name: 'email', value: 'bob@example.com' }]
};

const result = redactor.redactSync(input);
console.log(JSON.stringify(result, null, 2));
// authKey removed; email / events[0].value redacted
