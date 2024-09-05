import { FieldRedactor } from '../fieldRedactor';
import { FieldRedactorImpl } from '../fieldRedactor/impl/fieldRedactorImpl';
import { SecretParser } from '../secrets';
import { SecretParserImpl } from '../secrets/impl/secretParserImpl';
import { FunctionalStrategy, getHashStrategy, getRedactionStrategy } from '../strategies';
import { GetRedactorConfig, RedactorConfig, Values } from '../types/config';
import { TypeCheckers } from '../utils/typeCheckers';

const getStrategy = (config: GetRedactorConfig): FunctionalStrategy => {
  if (config.redactor !== undefined) {
    return config.redactor;
  } else if (config.algorithm) {
    const { algorithm, encoding, shouldFormat } = config;
    return getHashStrategy(algorithm, encoding, shouldFormat);
  }
  return getRedactionStrategy();
};

const getSecretParser = (config: GetRedactorConfig): SecretParser => {
  const { redactAll, keys, ignoredKeys } = config;
  return new SecretParserImpl({ redactAll, keys, ignoredKeys });
};

const getValuesConfig = (config: GetRedactorConfig): Values => {
  let [booleans, dates, functions]: boolean[] | undefined[] = [
    false,
    false,
    false
  ];
  if (config.values) {
    booleans = config.values.booleans;
    dates = config.values.dates;
    functions = config.values.functions;
  }

  if (!TypeCheckers.isValuesConfig({ booleans, dates, functions })) {
    throw new Error('Invalid values config type provided');
  }

  return {
    booleans: !!booleans,
    dates: !!dates,
    functions: !!functions
  };
};

export const getFieldRedactor = (input?: GetRedactorConfig): FieldRedactor => {
  const config: GetRedactorConfig = input || {};
  const redactorConfig: RedactorConfig = {
    redactor: getStrategy(config),
    secretParser: getSecretParser(config),
    values: getValuesConfig(config),
    deepRedactSecrets: !!config.deepRedactSecrets
  };

  return new FieldRedactorImpl(redactorConfig);
};
