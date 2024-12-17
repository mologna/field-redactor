import { Redactor } from './redactor';

export type CustomObject = {
  [key: string]: boolean | CustomObject | string;
};

export type SecretManagerConfig = {
  secretKeys?: RegExp[];
  deepSecretKeys?: RegExp[];
  fullSecretKeys?: RegExp[];
};

export type FieldRedactorConfig = SecretManagerConfig & {
  redactNullOrUndefined?: boolean;
  replacementText?: string;
  redactor?: Redactor;
  customObjects?: CustomObject[];
  ignoreBooleans?: boolean;
  ignoreDates?: boolean;
};
