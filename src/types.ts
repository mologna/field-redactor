import moment from "moment";

export type Redactor = (value: any) => Promise<string>;

export enum CustomObjectMatchType {
  Full,
  Deep,
  Shallow,
  Pass,
  Ignore
};

export type CustomObject = {
  [key: string]: boolean | CustomObjectMatchType | string;
};

export type PrimitiveRedactorConfig = {
  redactor?: Redactor;
  ignoreBooleans?: boolean;
  ignoreDates?: moment.MomentBuiltinFormat[];
  ignoreNullOrUndefined?: boolean;
}

export type SecretManagerConfig = {
  secretKeys?: RegExp[];
  deepSecretKeys?: RegExp[];
  fullSecretKeys?: RegExp[];
};

export type FieldRedactorConfig = PrimitiveRedactorConfig & SecretManagerConfig & {
  replacementText?: string;
  redactor?: Redactor;
  customObjects?: CustomObject[];
};