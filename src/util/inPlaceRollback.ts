/** Undoes in-place writes from one sync traversal. Not shared across calls. */
export type InPlaceRollback = {
  undo(): void;
  record(undo: () => void): void;
};

export const createInPlaceRollback = (): InPlaceRollback => {
  const entries: Array<() => void> = [];
  return {
    record(undo) {
      entries.push(undo);
    },
    undo() {
      for (let index = entries.length - 1; index >= 0; index -= 1) {
        entries[index]();
      }
    }
  };
};
