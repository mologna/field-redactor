import { SecretParser } from '../secrets';
import { FunctionalStrategy } from '../strategies';
import { BinaryToTextEncoding } from './encodings';
import { HASH_STRATEGIES } from './hashStrategies';

export type STRATEGY_TYPES = 'hash' | 'config';

export type StrategyConfig = {
  redactor?: FunctionalStrategy
  algorithm?: HASH_STRATEGIES;
  encoding?: BinaryToTextEncoding;
  shouldFormat?: boolean;
};

export type SecretConfig = Partial<{
  redactAll: boolean;
  keys: RegExp[];
  ignoredKeys: RegExp[];
}>;

export type Values = {
  booleans: boolean;
  dates: boolean;
  functions: boolean;
};

export type ValuesConfig = Partial<Values>;

export type SpecialObjects = Record<string, any>;

type RedactorConfigValues = {
  values: Values;
  deepRedactSecrets: boolean;
  specialObjects?: SpecialObjects;
  strictMatchSpecialObjects?: boolean;
};

export type RedactorConfig = RedactorConfigValues & {
  redactor: FunctionalStrategy;
  secretParser: SecretParser;
};

export type GetRedactorConfig = Partial<StrategyConfig> &
  SecretConfig &
  Partial<RedactorConfigValues>;
