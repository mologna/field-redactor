import { Strategy } from '../../src/strategies';

export const MOCK_OBFUSCATED = 'MOCK_OBFUSCATED';
export const MOCK_SHORT_STRATEGY_NAME = 'foo';
export const MOCK_STRATEGY_NAME = `${MOCK_SHORT_STRATEGY_NAME}_bar`;

class MockStrategy implements Strategy {
  public execute(value: string): string {
    return MOCK_OBFUSCATED;
  }

  public getName(): string {
    return MOCK_STRATEGY_NAME;
  }
}

export const mockStrategy = new MockStrategy();
