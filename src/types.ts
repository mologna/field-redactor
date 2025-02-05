export type Redactor = (value: any) => Promise<string>;

export enum CustomObjectMatchType {
  Full,
  Deep,
  Shallow,
  Pass,
  Ignore
}

export type CustomObject = {
  [key: string]: CustomObjectMatchType | string;
};

export type PrimitiveRedactorConfig = {
  redactor?: Redactor;
  ignoreBooleans: boolean;
  ignoreNullOrUndefined: boolean;
};

export type SecretManagerConfig = {
  secretKeys?: RegExp[];
  deepSecretKeys?: RegExp[];
  fullSecretKeys?: RegExp[];
  deleteSecretKeys?: RegExp[];
};

export type FieldRedactorConfig = Partial<PrimitiveRedactorConfig> &
  SecretManagerConfig & {
    redactor?: Redactor;
    customObjects?: CustomObject[];
  };
