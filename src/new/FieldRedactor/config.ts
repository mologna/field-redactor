export type FieldRedactorConfig = {
  replacementText?: string;
  secretKeys?: RegExp[];
  deepSecretKeys?: RegExp[];
}