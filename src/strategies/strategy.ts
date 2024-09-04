export interface Strategy {
  execute(value: string): string;
}

export type FunctionalStrategy = (value: string) => string;
