export interface Strategy {
  execute(value: string): string;
  getName(): string;
}
