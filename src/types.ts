import moment from "moment";

export type Redactor = (value: any) => Promise<string>;

export type CustomObject = {
  [key: string]: boolean | string;
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