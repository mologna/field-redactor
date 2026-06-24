import rfdc from 'rfdc';
import { ObjectRedactorCowTraversal } from '../../src/objectRedactorCow';
import { PrimitiveRedactor } from '../../src/primitiveRedactor';
import { SecretManager } from '../../src/secretManager';
import { CustomObjectManager } from '../../src/customObjectManager';
import { validNestedInputWithAllTypes } from '../mocks/inputMocks';
import { ObjectRedactor } from '../../src/objectRedactor';

describe('ObjectRedactorCowTraversal', () => {
  const deepCopy = rfdc({ proto: true, circles: true });
  let traversal: ObjectRedactorCowTraversal;

  beforeEach(() => {
    const primitiveRedactor = new PrimitiveRedactor({ ignoreBooleans: false, ignoreNullOrUndefined: true });
    const secretManager = new SecretManager({ secretKeys: [/password/] });
    const customObjectManager = new CustomObjectManager();
    traversal = new ObjectRedactorCowTraversal(primitiveRedactor, secretManager, customObjectManager);
  });

  it('redacts nested values without mutating the input', () => {
    const input = { password: 'secret', nested: { password: 'value', safe: 'ok' } };
    const result = traversal.redactCopyOnWrite(input);

    expect(input.password).toBe('secret');
    expect(result.password).toBe('REDACTED');
    expect(result.nested.password).toBe('REDACTED');
    expect(result.nested.safe).toBe('ok');
    expect(result.nested).not.toBe(input.nested);
    expect(input.nested.password).toBe('value');
  });

  it('shares unmodified sibling subtrees with the input', () => {
    const profile = { city: 'NYC' };
    const input = { password: 'secret', profile };
    const result = traversal.redactCopyOnWrite(input);

    expect(result.profile).toBe(profile);
  });

  it('matches redactInPlaceSync output for complex nested input', () => {
    const primitiveRedactor = new PrimitiveRedactor({ ignoreBooleans: false, ignoreNullOrUndefined: true });
    const secretManager = new SecretManager({});
    const customObjectManager = new CustomObjectManager();
    const fullRedactor = new ObjectRedactor(primitiveRedactor, secretManager, customObjectManager);

    const cowInput = deepCopy(validNestedInputWithAllTypes);
    const syncInput = deepCopy(validNestedInputWithAllTypes);

    const cowResult = fullRedactor.redactCopyOnWrite(cowInput);
    fullRedactor.redactInPlaceSync(syncInput);

    expect(cowResult).toEqual(syncInput);
  });
});
