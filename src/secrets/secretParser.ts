export interface SecretParser {
  isSecret(str: string): boolean;
  isIgnored(str: string): boolean;
}