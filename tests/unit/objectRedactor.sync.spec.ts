import { validNestedInputWithAllTypes } from '../mocks/inputMocks';
import {
  deepCopy,
  makeObjectRedactorFixture,
  ObjectRedactorFixture
} from '../helpers/objectRedactorSpecUtils';

describe('ObjectRedactor sync traversal', () => {
  let fixture: ObjectRedactorFixture;

  beforeEach(() => {
    fixture = makeObjectRedactorFixture();
  });

  it('redactInPlaceSync produces the same result as redactInPlace for default configuration', async () => {
    const asyncInput = deepCopy(validNestedInputWithAllTypes);
    const syncInput = deepCopy(validNestedInputWithAllTypes);

    await fixture.basicObjectRedactor.redactInPlace(asyncInput);
    fixture.basicObjectRedactor.redactInPlaceSync(syncInput);

    expect(syncInput).toEqual(asyncInput);
  });

  it('redactCopyOnWrite produces the same result as redactInPlaceSync on a deep clone', () => {
    const cowInput = deepCopy(validNestedInputWithAllTypes);
    const syncInput = deepCopy(validNestedInputWithAllTypes);

    const cowResult = fixture.basicObjectRedactor.redactCopyOnWrite(cowInput);
    fixture.basicObjectRedactor.redactInPlaceSync(syncInput);

    expect(cowResult).toEqual(syncInput);
  });

});
