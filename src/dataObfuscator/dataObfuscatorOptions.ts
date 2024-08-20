import { Formatter } from '../formatter/formatter';

export type DataObfuscatorOptions = {
  values: {
    dates: boolean;
    functions: boolean;
    booleans: boolean;
  };
  formatter?: Formatter;
};
