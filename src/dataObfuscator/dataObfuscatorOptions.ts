import { Formatter } from '../formatter/formatter';

export type DataObfuscatorOptions = Partial<{
  values: {
    dates: boolean;
    functions: boolean;
    booleans: boolean;
  };
  format: string | Formatter;
}>;
