import { Redactor } from "../redactor/redactor";

export type FieldRedactorConfig = {
  redactNullOrUndefined?: boolean;
  replacementText?: string;
  secretKeys?: RegExp[];
  deepSecretKeys?: RegExp[];
  redactor?: Redactor
}