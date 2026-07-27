/**
 * Value-pattern redaction: match scalar string forms regardless of key name.
 */
import { FieldRedactor } from '../src';

const redactor = FieldRedactor.createSafe({
  secretKeys: [],
  valuePatterns: [/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, /\d{3}-\d{2}-\d{4}/]
});

const input = {
  note: 'Contact alice@example.com or SSN 111-22-3333',
  label: 'safe'
};

console.log(JSON.stringify(redactor.redactSync(input), null, 2));
