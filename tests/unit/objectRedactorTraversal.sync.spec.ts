import { validNestedInputWithAllTypes } from '../mocks/inputMocks';
import {
  deepCopy,
  makeObjectRedactorTraversalFixture,
  ObjectRedactorTraversalFixture
} from '../helpers/objectRedactorTraversalSpecUtils';

describe('ObjectRedactorTraversal sync traversal', () => {
  let fixture: ObjectRedactorTraversalFixture;

  beforeEach(() => {
    fixture = makeObjectRedactorTraversalFixture();
  });

  it('redactInPlaceSync produces the same result as redactInPlace for default configuration', async () => {
    const asyncInput = deepCopy(validNestedInputWithAllTypes);
    const syncInput = deepCopy(validNestedInputWithAllTypes);

    await fixture.basicTraversal.redactInPlace(asyncInput);
    fixture.basicTraversal.redactInPlace(syncInput);

    expect(syncInput).toEqual(asyncInput);
  });

  it('redactCopyOnWrite produces the same result as redactInPlaceSync on a deep clone', () => {
    const cowInput = deepCopy(validNestedInputWithAllTypes);
    const syncInput = deepCopy(validNestedInputWithAllTypes);

    const cowResult = fixture.basicTraversal.redactCopyOnWrite(cowInput);
    fixture.basicTraversal.redactInPlace(syncInput);

    expect(cowResult).toEqual(syncInput);
  });

});
