import { CustomObjectManager } from './customObjectManager';
import { DryRunReport, isJsonObject, JsonObject, JsonValue } from './types';

export const EMPTY_DRY_RUN_REPORT: DryRunReport = {
  redactedPaths: [],
  deletedPaths: [],
  matchedSchemas: []
};

const joinPath = (base: string, segment: string | number): string =>
  typeof segment === 'number' ? (base ? `${base}[${segment}]` : `[${segment}]`) : base ? `${base}.${segment}` : segment;

const isTraversable = (value: JsonValue | undefined): value is JsonObject | JsonValue[] =>
  !!value && typeof value === 'object' && !(value instanceof Date);

const pushPath = (report: DryRunReport, path: string, list: 'redactedPaths' | 'deletedPaths'): void => {
  if (path) {
    report[list].push(path);
  }
};

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
    pushPath(report, path, after === undefined && before !== undefined ? 'deletedPaths' : 'redactedPaths');
    return;
  }

  if (Array.isArray(before)) {
    if (!Array.isArray(after)) {
      pushPath(report, path, 'redactedPaths');
      return;
    }

    for (let index = 0; index < Math.max(before.length, after.length); index++) {
      if (!Object.prototype.hasOwnProperty.call(after, index) && Object.prototype.hasOwnProperty.call(before, index)) {
        report.deletedPaths.push(joinPath(path, index));
        continue;
      }

      diffRedaction(before[index], after[index], joinPath(path, index), report);
    }
    return;
  }

  if (!isJsonObject(before) || !isJsonObject(after)) {
    pushPath(report, path, 'redactedPaths');
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

const collectMatchedSchemas = (
  value: JsonValue | undefined,
  manager: CustomObjectManager,
  path: string,
  report: DryRunReport
): void => {
  if (!isTraversable(value)) {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => collectMatchedSchemas(item, manager, joinPath(path, index), report));
    return;
  }

  if (isJsonObject(value)) {
    const schema = manager.getMatchingCustomObject(value);
    if (schema) {
      report.matchedSchemas.push({ path: path || '(root)', schemaIndex: manager.getSchemaIndex(schema) });
    }

    for (const key of Object.keys(value)) {
      collectMatchedSchemas(value[key], manager, joinPath(path, key), report);
    }
  }
};

export const buildDryRunReport = (
  before: JsonValue | undefined,
  after: JsonValue | undefined,
  manager: CustomObjectManager
): DryRunReport => {
  const report: DryRunReport = { redactedPaths: [], deletedPaths: [], matchedSchemas: [] };

  if (before !== undefined) {
    diffRedaction(before, after, '', report);
    collectMatchedSchemas(before, manager, '', report);
  }

  return report;
};
