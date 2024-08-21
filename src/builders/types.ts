export type SecretParserConfig = {
  secretKeys?: RegExp[];
  ignoredSecretKeys?: RegExp[];
  shouldNotFollow?: boolean;
}
