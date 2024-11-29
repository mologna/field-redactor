import { Redactor } from "../redactor/redactor";

export type FieldRedactorConfig = {
  replacementText?: string;
  secretKeys?: RegExp[];
  deepSecretKeys?: RegExp[];
  redactor?: Redactor
}