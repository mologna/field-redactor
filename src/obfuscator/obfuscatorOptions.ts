import { Formatter } from '../formatter/formatter';
import { Secret } from '../secrets/secret';

export type ObfuscatorOptions = {
  values: {
    dates: boolean;
    functions: boolean;
    booleans: boolean;
  };
  formatter?: Formatter;
  secrets?: {
    parser: Secret,
    shouldNotFollow?: boolean
  }
};

