import { Redactor } from "./redactor";

export type CustomObject = {
  [key: string]: boolean | CustomObject | string;
}

export type FieldRedactorConfig = {
  redactNullOrUndefined?: boolean;
  replacementText?: string;
  secretKeys?: RegExp[];
  deepSecretKeys?: RegExp[];
  redactor?: Redactor
  customObjects?: CustomObject[];
}