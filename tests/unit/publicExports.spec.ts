import * as fs from 'fs';
import * as path from 'path';
import * as fieldRedactor from '../../src';

const REMOVED_ROOT_EXPORTS = [
  'JsonFunction',
  'JsonLeafValue',
  'RedactablePrimitive',
  'RedactedPrimitive',
  'SecretSpecifierValue',
  'TraversableJson'
] as const;

describe('public package exports', () => {
  it('does not re-export incidental @internal types from src/index.ts', () => {
    const source = fs.readFileSync(path.join(__dirname, '../../src/index.ts'), 'utf8');
    for (const name of REMOVED_ROOT_EXPORTS) {
      expect(source).not.toMatch(new RegExp(`\\b${name}\\b`));
    }
  });

  it('still exports supported runtime API surface', () => {
    expect(fieldRedactor).toHaveProperty('isJsonObject');
    expect(fieldRedactor).toHaveProperty('FieldRedactor');
    expect(fieldRedactor).toHaveProperty('CustomObjectMatchType');
    expect(fieldRedactor).toHaveProperty('validateFieldRedactorConfig');
    expect(fieldRedactor).toHaveProperty('presets');
  });
});
