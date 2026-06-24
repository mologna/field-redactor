import { CustomObjectManager } from './customObjectManager';
import { buildPathRules } from './dryRunAttribution';
import { isTraversableJson, joinPath, walkTraversableJson } from './jsonWalk';
import { SecretManager } from './secretManager';
import { ValuePatternMatcher } from './valuePatternMatcher';
import { DryRunReport, isJsonObject, JsonValue } from './types';

export const createEmptyDryRunReport = (): DryRunReport => ({
  redactedPaths: [],
  deletedPaths: [],
  matchedSchemas: [],
  pathRules: []
});

export const EMPTY_DRY_RUN_REPORT: DryRunReport = createEmptyDryRunReport();

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

  if (!isTraversableJson(before) || !isTraversableJson(after)) {
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
  walkTraversableJson(value, path, (node, nodePath) => {
    const schema = manager.getMatchingCustomObject(node);
    if (!schema) {
      return;
    }

    report.matchedSchemas.push({
      path: nodePath || '(root)',
      ...manager.getSchemaMetadata(schema)
    });
  });
};

export const buildDryRunReport = (
  before: JsonValue | undefined,
  after: JsonValue | undefined,
  manager: CustomObjectManager,
  secretManager: SecretManager,
  valuePatternMatcher: ValuePatternMatcher
): DryRunReport => {
  const report = createEmptyDryRunReport();

  if (before !== undefined) {
    diffRedaction(before, after, '', report);
    collectMatchedSchemas(before, manager, '', report);
    report.pathRules = buildPathRules(
      before,
      report.redactedPaths,
      report.deletedPaths,
      secretManager,
      manager,
      valuePatternMatcher
    );
  }

  return report;
};
