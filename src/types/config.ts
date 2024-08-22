import { SecretParser } from "../secrets";
import { Strategy } from "../strategies";
import { BinaryToTextEncoding } from "./encodings";
import { HASH_STRATEGIES } from "./hashStrategies";

export type STRATEGY_TYPES = 'hash' | 'config';

export type BaseStrategyConfig = {
  type: STRATEGY_TYPES;
}

export type HashStrategyConfig = BaseStrategyConfig & {
  type: 'hash',
  algorithm: HASH_STRATEGIES,
  encoding?: BinaryToTextEncoding
  shouldFormat?: boolean;
}

export type RedactionStrategyConfig = BaseStrategyConfig & {
  type: 'redaction',
  replacementText?: string;
}

export type StrategyConfig = HashStrategyConfig | RedactionStrategyConfig;

export type SecretKeysConfig = {
  deep: boolean;
  keys: RegExp[];
  ignoreKeys: RegExp[];
}

export type SecretConfig = Partial<{
  redactAll: boolean;
  deepRedactSecrets: boolean;
  keys: RegExp[];
  ignoredKeys: RegExp[];
}>;

export type Values = {
  booleans: boolean;
  dates: boolean;
  functions: boolean;
}

export type ValuesConfig = Partial<Values>;

export type RedactorConfig = {
  strategy: Strategy;
  secretParser: SecretParser;
  values: Values;
  deepRedactSecrets: boolean;
}