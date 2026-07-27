/**
 * dryRun: preview redacted output plus path attribution without guessing rules by hand.
 */
import { FieldRedactorConfigBuilder } from '../src';

const redactor = FieldRedactorConfigBuilder.create()
  .shallow(/email/i)
  .remove(/authKey/i)
  .opaque(/rawPayload/i)
  .buildSafeRedactor();

const input = {
  email: 'alice@example.com',
  authKey: 'secret',
  rawPayload: { token: 'x' },
  note: 'ok'
};

const { result, report } = redactor.dryRunSync(input);
console.log('result', JSON.stringify(result, null, 2));
console.log('report', JSON.stringify(report, null, 2));
