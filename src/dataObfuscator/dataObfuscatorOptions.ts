export type DataObfuscatorOptions = Partial<{
  values: {
    dates: boolean;
    functions: boolean;
    booleans: boolean;
  }
}>