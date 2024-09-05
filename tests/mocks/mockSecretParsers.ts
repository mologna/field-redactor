import { DEFAULT_SECRET_KEYS, SecretParser } from '../../src';
import { SecretParserImpl } from '../../src/secrets/impl/secretParserImpl';

export const redactAllSecretParser: SecretParser = {
  isSecret: (value: string) => true,
  isIgnored: (value: string) => false
};

export const redactAllWithFoobarExceptionSecretsParser: SecretParser = {
  isSecret: (value: string) => true,
  isIgnored: (value: string) => /\bfoobar\b/i.test(value)
};

export const redactNormalSecretsParser: SecretParser = new SecretParserImpl({
  redactAll: false,
  keys: DEFAULT_SECRET_KEYS
});

export const redactNoSecretsParser: SecretParser = new SecretParserImpl({
  redactAll: false,
  keys: []
});
