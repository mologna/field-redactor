/**
 * Path rules and pass-key allowlists under deep parents.
 */
import { FieldRedactorConfigBuilder } from '../src';

const redactor = FieldRedactorConfigBuilder.create()
  .pathRule('session.token', 'remove')
  .pathRule('logs.*.message', 'deep')
  .deep(/accountInfo/)
  .passKey(/^id$/, /^profile$/)
  .buildSafeRedactor();

const input = {
  session: { token: 'abc', id: '1' },
  logs: [{ message: 'secret', meta: { note: 'nested' } }],
  accountInfo: {
    id: 'user-1',
    profile: { displayName: 'Alice' },
    ssn: '111-22-3333'
  }
};

console.log(JSON.stringify(redactor.redactSync(input), null, 2));
