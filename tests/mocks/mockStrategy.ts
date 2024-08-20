import { Strategy } from '../../src/strategies';

export const MOCK_OBFUSCATED = 'MOCK_OBFUSCATED';

class MockStrategy implements Strategy {
  public execute(value: string): string {
    return MOCK_OBFUSCATED;
  }
}

export const mockStrategy = new MockStrategy();
