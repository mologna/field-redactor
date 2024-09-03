import { FieldRedactor } from '../fieldRedactor';
import { FieldRedactorImpl } from '../fieldRedactor/impl/fieldRedactorImpl';
import { SecretParser } from '../secrets';
import { secretParserImpl } from '../secrets/impl/secretParserImpl';
import { Strategy } from '../strategies';
import { HashStrategy } from '../strategies/impl/hashStrategy';
import { RedactionStrategy } from '../strategies/impl/redactionStrategy';
import { GetRedactorConfig, RedactorConfig, Values } from '../types/config';
import { TypeCheckers } from '../utils/typeCheckers';

const getStrategy = (config: GetRedactorConfig): Strategy => {
  const { type } = config;
  switch (type) {
    case 'hash': {
      const { algorithm, encoding, shouldFormat } = config;
      return new HashStrategy({
        type,
        algorithm,
        encoding,
        shouldFormat
      });
    }
    default: {
      const { replacementText } = config;
      return new RedactionStrategy({
        type: 'redaction',
        replacementText
      });
    }
  }
};

const getSecretParser = (config: GetRedactorConfig): SecretParser => {
  const { redactAll, keys, ignoredKeys } = config;
  return new secretParserImpl({ redactAll, keys, ignoredKeys });
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

export const getReadactor = (input?: GetRedactorConfig): FieldRedactor => {
  const config: GetRedactorConfig = input || {
    type: 'redaction'
  };
  const redactorConfig: RedactorConfig = {
    strategy: getStrategy(config),
    secretParser: getSecretParser(config),
    values: getValuesConfig(config),
    deepRedactSecrets: !!config.deepRedactSecrets
  };

  return new FieldRedactorImpl(redactorConfig);
};
