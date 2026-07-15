import { getJsonValueAtPath, getParentContext, parseJsonPath } from '../../src/util/jsonWalk';

describe('jsonWalk path helpers', () => {
  it('parseJsonPath handles root, nested, and indexed segments', () => {
    expect(parseJsonPath('')).toEqual([]);
    expect(parseJsonPath('username')).toEqual(['username']);
    expect(parseJsonPath('metadata[0].value')).toEqual(['metadata', 0, 'value']);
  });

  it('getJsonValueAtPath and getParentContext resolve nested values', () => {
    const value = {
      metadata: [{ value: 'secret' }]
    };

    const segments = parseJsonPath('metadata[0].value');
    expect(getJsonValueAtPath(value, segments)).toBe('secret');
    expect(getParentContext(value, segments)).toEqual({
      parent: value.metadata[0],
      leaf: 'value'
    });
  });

  it('returns undefined for invalid path segments', () => {
    expect(getJsonValueAtPath({ items: [] }, ['items', 'name'])).toBeUndefined();
    expect(getJsonValueAtPath(null, ['name'])).toBeUndefined();
    expect(getParentContext({ name: 'x' }, [])).toEqual({ parent: undefined, leaf: undefined });
    expect(getParentContext('text', ['length'])).toEqual({ parent: undefined, leaf: 'length' });
  });
});
