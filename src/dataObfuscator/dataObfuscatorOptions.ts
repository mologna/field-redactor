import { Formatter } from "../formatter";

export type DataObfuscatorOptions = Partial<{
  obfuscateDates: boolean;
  obfuscateFunctions: boolean;
  // formatter: Formatter;
  obfuscateBooleans: boolean;
}>