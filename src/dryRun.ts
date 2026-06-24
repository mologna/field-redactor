import { CustomObjectManager } from './customObjectManager';
import { CustomObject, DryRunReport, isJsonObject, JsonObject, JsonValue } from './types';

const joinPath = (base: string, segment: string | number): string => {
  if (typeof segment === 'number') {
    return base ? `${base}[${segment}]` : `[${segment}]`;
  }

  return base ? `${base}.${segment}` : segment;
};

const isTraversable = (value: JsonValue | undefined): value is JsonObject | JsonValue[] =>
  !!value && typeof value === 'object' && !(value instanceof Date);

const diffRedaction = (
  before: JsonValue | undefined,
  after: JsonValue | undefined,
  path: string,
  report: DryRunReport
): void => {
  if (before === after) {
    return;
  }

  if (!isTraversable(before) || !isTraversable(after)) {
    if (after === undefined && before !== undefined) {
      if (path) {
        report.deletedPaths.push(path);
      }
    } else if (path) {
      report.redactedPaths.push(path);
    }
    return;
  }

  if (Array.isArray(before)) {
    if (!Array.isArray(after)) {
      if (path) {
        report.redactedPaths.push(path);
      }
      return;
    }

    const maxLength = Math.max(before.length, after.length);
    for (let index = 0; index < maxLength; index++) {
      if (!Object.prototype.hasOwnProperty.call(after, index) && Object.prototype.hasOwnProperty.call(before, index)) {
        report.deletedPaths.push(joinPath(path, index));
        continue;
      }

      diffRedaction(before[index], after[index], joinPath(path, index), report);
    }
    return;
  }

  if (!isJsonObject(before) || !isJsonObject(after)) {
    if (path) {
      report.redactedPaths.push(path);
    }
    return;
  }

  for (const key of Object.keys(before)) {
    const childPath = joinPath(path, key);
    if (!Object.prototype.hasOwnProperty.call(after, key)) {
      report.deletedPaths.push(childPath);
    } else {
      diffRedaction(before[key], after[key], childPath, report);
    }
  }
};

const walkMatchedSchemas = (
  value: JsonValue | undefined,
  manager: CustomObjectManager,
  customObjects: CustomObject[],
  path: string,
  report: DryRunReport
): void => {
  if (!isTraversable(value)) {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => walkMatchedSchemas(item, manager, customObjects, joinPath(path, index), report));
    return;
  }

  if (isJsonObject(value)) {
    const schema = manager.getMatchingCustomObject(value);
    if (schema) {
      report.matchedSchemas.push({
        path: path || '(root)',
        schemaIndex: customObjects.indexOf(schema)
      });
    }

    for (const key of Object.keys(value)) {
      walkMatchedSchemas(value[key], manager, customObjects, joinPath(path, key), report);
    }
  }
};

export const buildDryRunReport = (
  before: JsonValue | undefined,
  after: JsonValue | undefined,
  manager: CustomObjectManager,
  customObjects: CustomObject[]
): DryRunReport => {
  const report: DryRunReport = {
    redactedPaths: [],
    deletedPaths: [],
    matchedSchemas: []
  };

  if (before !== undefined) {
    diffRedaction(before, after, '', report);
    walkMatchedSchemas(before, manager, customObjects, '', report);
  }

  return report;
};

export const createEmptyDryRunReport = (): DryRunReport => ({
  redactedPaths: [],
  deletedPaths: [],
  matchedSchemas: []
});
