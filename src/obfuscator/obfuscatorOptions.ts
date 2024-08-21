import { Formatter } from '../formatter/formatter';
import { SecretParser } from '../secrets';

export type ObfuscatorOptions = {
  values: {
    dates: boolean;
    functions: boolean;
    booleans: boolean;
  };
  formatter?: Formatter;
  secrets?: {
    parser: SecretParser,
    shouldNotFollow?: boolean
  }
};

