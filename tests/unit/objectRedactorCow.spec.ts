import rfdc from 'rfdc';
import { validNestedInputWithAllTypes } from '../mocks/inputMocks';
import { createObjectRedactor, createSyncTraversal } from '../helpers/redactorTestUtils';

describe('ObjectRedactorSyncTraversal copy-on-write', () => {
  const deepCopy = rfdc({ proto: true, circles: true });
  let traversal: ReturnType<typeof createSyncTraversal>;

  beforeEach(() => {
    traversal = createSyncTraversal({ secretManagerConfig: { secretKeys: [/password/] } });
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
    const fullRedactor = createObjectRedactor();

    const cowInput = deepCopy(validNestedInputWithAllTypes);
    const syncInput = deepCopy(validNestedInputWithAllTypes);

    const cowResult = fullRedactor.redactCopyOnWrite(cowInput);
    fullRedactor.redactInPlaceSync(syncInput);

    expect(cowResult).toEqual(syncInput);
  });
});
