import { DEFAULT_SECRET_KEYS, SecretParser } from "../../src";
import { secretParserImpl } from "../../src/secrets/impl/secretParserImpl";

export const redactAllSecretParser: SecretParser = {
  isSecret: (value: string) => true,
  isIgnored: (value: string) => false
};

export const redactAllWithFoobarExceptionSecretsParser: SecretParser = {
  isSecret: (value: string) => true,
  isIgnored: (value: string) => (/\bfoobar\b/i).test(value)
}

export const redactNormalSecretsParser: SecretParser = new secretParserImpl({
  redactAll: false,
  keys: DEFAULT_SECRET_KEYS
});
