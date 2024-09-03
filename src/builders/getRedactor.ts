import { ConfigObfuscatorImpl } from '../obfuscator/impl/configObfuscatorImpl';
import { SecretParser } from '../secrets';
import { ConfigSecretParserImpl } from '../secrets/impl/configSecretParserImpl';
import { Strategy } from '../strategies';
import { ConfigHashStrategy } from '../strategies/impl/configHashStrategy';
import { ConfigRedactionStrategy } from '../strategies/impl/configRedactionStrategy';
import { GetRedactorConfig, RedactorConfig, Values } from '../types/config';
import { TypeCheckers } from '../utils/typeCheckers';

const getStrategy = (config: GetRedactorConfig): Strategy => {
  const { type } = config;
  switch (type) {
    case 'hash': {
      const { algorithm, encoding, shouldFormat } = config;
      return new ConfigHashStrategy({
        type,
        algorithm,
        encoding,
        shouldFormat
      });
    }
    default: {
      const { replacementText } = config;
      return new ConfigRedactionStrategy({
        type: 'redaction',
        replacementText
      });
    }
  }
};

const getSecretParser = (config: GetRedactorConfig): SecretParser => {
  const { redactAll, keys, ignoredKeys } = config;
  return new ConfigSecretParserImpl({ redactAll, keys, ignoredKeys });
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

export const getReadactor = (input?: GetRedactorConfig) => {
  const config: GetRedactorConfig = input || {
    type: 'redaction'
  };
  const redactorConfig: RedactorConfig = {
    strategy: getStrategy(config),
    secretParser: getSecretParser(config),
    values: getValuesConfig(config),
    deepRedactSecrets: !!config.deepRedactSecrets
  };

  return new ConfigObfuscatorImpl(redactorConfig);
};
