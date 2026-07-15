import { FieldRedactorConfigurationError } from './errors';
import { CustomObject } from './types';

export const analyzeSchemaPairs = (
  customObjects: CustomObject[]
): { identicalPairs: Array<[number, number, string[]]>; subsetPairs: Array<[number, number]> } => {
  const identicalPairs: Array<[number, number, string[]]> = [];
  const subsetPairs: Array<[number, number]> = [];

  for (let i = 0; i < customObjects.length - 1; i++) {
    const keysA = Object.keys(customObjects[i]);
    for (let j = i + 1; j < customObjects.length; j++) {
      const keysB = Object.keys(customObjects[j]);
      if (keysA.length === keysB.length && keysA.every((key) => keysB.includes(key))) {
        identicalPairs.push([i, j, keysA]);
        continue;
      }

      const aSubsetOfB = keysA.length < keysB.length && keysA.every((key) => keysB.includes(key));
      const bSubsetOfA = keysB.length < keysA.length && keysB.every((key) => keysA.includes(key));
      if (aSubsetOfB || bSubsetOfA) {
        subsetPairs.push([i, j]);
      }
    }
  }

  return { identicalPairs, subsetPairs };
};

export const assertNoIdenticalCustomObjectSchemas = (customObjects?: CustomObject[]): void => {
  if (!customObjects || customObjects.length <= 1) {
    return;
  }

  for (const [i, j, keys] of analyzeSchemaPairs(customObjects).identicalPairs) {
    throw new FieldRedactorConfigurationError(
      `Custom Objects at indexes ${i} and ${j} cannot have identical keys: ${keys}`
    );
  }
};
