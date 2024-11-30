import { Redactor } from "../redactor/redactor";

export type CustomObject = {
  [key: string]: boolean | CustomObject;
}

export type FieldRedactorConfig = {
  redactNullOrUndefined?: boolean;
  replacementText?: string;
  secretKeys?: RegExp[];
  deepSecretKeys?: RegExp[];
  redactor?: Redactor
  customObjects?: CustomObject[];
}