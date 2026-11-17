import { createContainerMutation } from '../../src/engine/objectRedactorMutation';
import { createInPlaceRollback, InPlaceRollback } from '../../src/util/inPlaceRollback';
import { JsonArray, JsonObject } from '../../src/types';

describe('createInPlaceRollback', () => {
  it('runs recorded undo steps in reverse order', () => {
    const rollback = createInPlaceRollback();
    const order: string[] = [];

    rollback.record(() => order.push('first'));
    rollback.record(() => order.push('second'));
    rollback.undo();

    expect(order).toEqual(['second', 'first']);
  });

  it('does nothing when no steps were recorded', () => {
    expect(() => createInPlaceRollback().undo()).not.toThrow();
  });
});

describe('createContainerMutation in-place writes', () => {
  const spyRollback = (): InPlaceRollback & { record: jest.Mock; undo: jest.Mock } => ({
    record: jest.fn(),
    undo: jest.fn()
  });

  it('records nothing when a set writes the value already present', () => {
    const rollback = spyRollback();
    const source: JsonObject = { a: 1 };

    createContainerMutation(source, false, rollback).set('a', 1);

    expect(rollback.record).not.toHaveBeenCalled();
  });

  it('records one step for a changed value and one for a new key', () => {
    const rollback = spyRollback();
    const source: JsonObject = { a: 1 };
    const mutation = createContainerMutation(source, false, rollback);

    mutation.set('a', 2);
    mutation.set('b', 3);

    expect(rollback.record).toHaveBeenCalledTimes(2);
  });

  it('records nothing when removing a key that is not present', () => {
    const rollback = spyRollback();
    const source: JsonObject = { a: 1 };

    createContainerMutation(source, false, rollback).remove('missing');

    expect(rollback.record).not.toHaveBeenCalled();
    expect(source).toEqual({ a: 1 });
  });

  it('records one step when removing a present key', () => {
    const rollback = spyRollback();
    const source: JsonObject = { a: 1 };

    createContainerMutation(source, false, rollback).remove('a');

    expect(rollback.record).toHaveBeenCalledTimes(1);
    expect(source).toEqual({});
  });

  it('applies writes without a rollback handle and records nothing', () => {
    const source: JsonObject = { a: 1 };

    createContainerMutation(source, false).set('a', 2);

    expect(source).toEqual({ a: 2 });
  });

  it('ignores the rollback handle for copy-on-write containers', () => {
    const rollback = spyRollback();
    const source: JsonObject = { a: 1 };
    const mutation = createContainerMutation(source, true, rollback);

    mutation.set('a', 2);

    expect(rollback.record).not.toHaveBeenCalled();
    expect(source).toEqual({ a: 1 });
    expect(mutation.result()).toEqual({ a: 2 });
  });

  it('restores an object to its original keys and values after mixed writes', () => {
    const rollback = createInPlaceRollback();
    const source: JsonObject = { a: 1, b: 2 };
    const mutation = createContainerMutation(source, false, rollback);

    mutation.set('a', 9);
    mutation.remove('b');
    mutation.set('c', 3);
    rollback.undo();

    expect(Object.keys(source)).toEqual(['a', 'b']);
    expect(source).toEqual({ a: 1, b: 2 });
  });

  it('restores an array element and its length after an in-place write and remove', () => {
    const rollback = createInPlaceRollback();
    const source: JsonArray = ['x', 'y', 'z'];
    const mutation = createContainerMutation(source, false, rollback);

    mutation.set('1', 'Y');
    mutation.remove('2');
    rollback.undo();

    expect(source).toEqual(['x', 'y', 'z']);
    expect(source).toHaveLength(3);
  });
});
