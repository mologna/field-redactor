import { SecretParser } from '../secrets';
import { FunctionalStrategy } from '../strategies';
import { BinaryToTextEncoding } from './encodings';
import { HASH_STRATEGIES } from './hashStrategies';

export type STRATEGY_TYPES = 'hash' | 'config';

export type HashStrategyConfig = {
  type: 'hash';
  algorithm: HASH_STRATEGIES;
  encoding?: BinaryToTextEncoding;
  shouldFormat?: boolean;
};

// Redaction strategy is default so all values are optional
export type RedactionStrategyConfig = {
  type?: 'redaction';
  replacementText?: string;
};

export type StrategyConfig = HashStrategyConfig | RedactionStrategyConfig;

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

export type GetRedactorConfig = StrategyConfig &
  SecretConfig &
  Partial<RedactorConfigValues>;
