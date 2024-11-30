import { Redactor } from "../redactor/redactor";

export type SpecialObject = {
  [key: string]: boolean | SpecialObject;
}

export type FieldRedactorConfig = {
  redactNullOrUndefined?: boolean;
  replacementText?: string;
  secretKeys?: RegExp[];
  deepSecretKeys?: RegExp[];
  redactor?: Redactor
  specialObjects?: SpecialObject[];
}