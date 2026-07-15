import { parseJsonPath, parsePathRulePattern, parsePathSegments } from '../../src/util/pathParsing';

describe('pathParsing', () => {
  it('parseJsonPath keeps numeric-looking segments as strings', () => {
    expect(parseJsonPath('metadata.0.value')).toEqual(['metadata', '0', 'value']);
  });

  it('parsePathRulePattern coerces numeric dot segments and supports wildcards', () => {
    expect(parsePathRulePattern('metadata.*.value')).toEqual(['metadata', '*', 'value']);
    expect(parsePathRulePattern('items.0.id')).toEqual(['items', 0, 'id']);
    expect(parsePathRulePattern('[2].name')).toEqual([2, 'name']);
  });

  it('parsePathSegments skips empty segments from adjacent delimiters', () => {
    expect(parsePathSegments('foo..bar', { coerceNumericSegments: true })).toEqual(['foo', 'bar']);
    expect(parsePathSegments('', { allowWildcard: true })).toEqual([]);
  });
});
