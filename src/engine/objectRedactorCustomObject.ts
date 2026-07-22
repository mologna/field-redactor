import { CustomObjectMatchType } from '../types';
import { MaybeAsync } from '../util/maybeAsync';

/** Shape-agnostic match-type handlers; callers map Pass/Deep/Shallow to the right effect. */
export type CustomObjectMatchHandlers = {
  remove(): MaybeAsync<void>;
  opaque(): MaybeAsync<void>;
  deep(): MaybeAsync<void>;
  shallow(): MaybeAsync<void>;
  pass(): MaybeAsync<void>;
};

export const applyCustomObjectMatchType = (
  matchType: CustomObjectMatchType,
  handlers: CustomObjectMatchHandlers
): MaybeAsync<void> => {
  switch (matchType) {
    case CustomObjectMatchType.Remove:
      return handlers.remove();
    case CustomObjectMatchType.Opaque:
      return handlers.opaque();
    case CustomObjectMatchType.Deep:
      return handlers.deep();
    case CustomObjectMatchType.Shallow:
      return handlers.shallow();
    case CustomObjectMatchType.Pass:
      return handlers.pass();
    default:
      return undefined;
  }
};
