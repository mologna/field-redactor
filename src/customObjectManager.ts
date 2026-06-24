import { CustomObject, JsonObject, MatchedSchemaReport } from './types';
import { assertNoIdenticalCustomObjectSchemas } from './configValidator';

/**
 * Utility for determining if a given object matches a CustomObject schema.
 * A value matches when it contains every key defined in the schema; additional keys on the value are allowed.
 * When multiple schemas match, the schema with the most keys is selected.
 */
export class CustomObjectManager {
  private readonly customObjects: CustomObject[];
  private readonly schemaNames: readonly (string | undefined)[];

  /**
   * Creates a CustomObjectChecker with the specified CustomObjects.
   * @param customObjects The CustomObjects to check against.
   * @param schemaNames Optional labels parallel to `customObjects` for dry-run reports.
   */
  constructor(customObjects?: CustomObject[], schemaNames?: readonly (string | undefined)[]) {
    assertNoIdenticalCustomObjectSchemas(customObjects);
    this.customObjects = customObjects ?? [];
    this.schemaNames = schemaNames ?? [];
  }

  public getSchemaIndex(schema: CustomObject): number {
    return this.customObjects.indexOf(schema);
  }

  public getSchemaName(schemaIndex: number): string | undefined {
    return this.schemaNames[schemaIndex];
  }

  public getSchemaMetadata(schema: CustomObject): Pick<MatchedSchemaReport, 'schemaIndex' | 'schemaName'> {
    const schemaIndex = this.getSchemaIndex(schema);
    const schemaName = this.getSchemaName(schemaIndex);
    return schemaName ? { schemaIndex, schemaName } : { schemaIndex };
  }

  /**
   * Determines if the input value matches any of the custom objects provided in the constructor.
   * When multiple schemas match, returns the schema with the most keys.
   * @param value The value to compare against the custom objects.
   * @returns The most specific matching custom object, otherwise undefined.
   */
  public getMatchingCustomObject(value: unknown): CustomObject | undefined {
    let bestMatch: CustomObject | undefined;
    let bestMatchKeyCount = -1;

    for (const customObject of this.customObjects) {
      if (this.isCustomObject(value, customObject)) {
        const keyCount = Object.keys(customObject).length;
        if (keyCount > bestMatchKeyCount) {
          bestMatch = customObject;
          bestMatchKeyCount = keyCount;
        }
      }
    }

    return bestMatch;
  }

  private isCustomObject(value: unknown, customObject: CustomObject): value is JsonObject {
    if (typeof value !== 'object' || !value || Array.isArray(value)) {
      return false;
    }

    return Object.keys(customObject).every((key) => Object.prototype.hasOwnProperty.call(value, key));
  }
}
