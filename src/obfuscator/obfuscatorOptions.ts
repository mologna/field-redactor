import { Formatter } from '../formatter/formatter';
import { SecretParser } from '../secrets';

export type SecretObfuscatorOptions = {
  parser: SecretParser,
  shouldNotFollow?: boolean
}

export type ObfuscatorOptions = {
  values: {
    dates: boolean;
    functions: boolean;
    booleans: boolean;
  };
  formatter?: Formatter;
  secrets?: SecretObfuscatorOptions;
};

