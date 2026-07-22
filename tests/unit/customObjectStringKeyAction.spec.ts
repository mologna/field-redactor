import { resolveCustomObjectStringKeyAction } from '../../src/engine/customObjectFieldHandler';
import { SecretManager } from '../../src/rules/secretManager';

describe('resolveCustomObjectStringKeyAction', () => {
  const manager = new SecretManager({
    secretKeys: [/shallow/],
    deepSecretKeys: [/deep/],
    opaqueSecretKeys: [/opaque/],
    removeSecretKeys: [/removed/]
  });

  it('classifies sibling key rules by precedence', () => {
    expect(resolveCustomObjectStringKeyAction(manager, 'removed')).toEqual({ type: 'remove' });
    expect(resolveCustomObjectStringKeyAction(manager, 'opaque')).toEqual({ type: 'opaque' });
    expect(resolveCustomObjectStringKeyAction(manager, 'deep')).toEqual({ type: 'traverse', forceDeep: true });
    expect(resolveCustomObjectStringKeyAction(manager, 'shallow')).toEqual({ type: 'traverse', forceDeep: false });
    expect(resolveCustomObjectStringKeyAction(manager, 'other')).toEqual({ type: 'none' });
  });

  it('treats legacy default-all-secret as shallow traverse', () => {
    const defaultManager = new SecretManager({});
    expect(resolveCustomObjectStringKeyAction(defaultManager, 'anything')).toEqual({
      type: 'traverse',
      forceDeep: false
    });
  });
});
