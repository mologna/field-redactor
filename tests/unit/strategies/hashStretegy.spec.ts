import { FunctionalStrategy, hashStrategies } from '../../../src/strategies';
import { getHashStrategy } from '../../../src/strategies/impl/hashStrategy';
import { HashMocks } from '../../mocks';
import { binaryToTextEncoding, HASH_STRATEGIES } from '../../../src/types';
import {
  Algorithms,
  CalculatedHash,
  algorithmsToCheck
} from '../../mocks/hashes';

describe('configHashStrategy', () => {
  it('Can create a HashStrategy with a variety of supported algorithms', () => {
    hashStrategies.forEach((algorithm: HASH_STRATEGIES) => {
      expect(() => getHashStrategy(algorithm)).not.toThrow();
    });
  });

  const checkAllEncodingsForAlgorithm = (algorithm: Algorithms) => {
    binaryToTextEncoding.forEach((encoding) => {
      const strategy: FunctionalStrategy = getHashStrategy(algorithm, encoding);
      HashMocks.calculatedHashes.forEach((calculatedHash: CalculatedHash) => {
        const result = strategy(calculatedHash.original);
        expect(result).toBe(calculatedHash[algorithm][encoding]);
      });
    });
  };

  it('Can hash using a variety of supported algorithms on different values with all digest outputs', () => {
    algorithmsToCheck.forEach((algorithm: Algorithms) => {
      checkAllEncodingsForAlgorithm(algorithm);
    });
  });

  it('Formats output when specified', () => {
    const strategy: FunctionalStrategy = getHashStrategy('md5', 'hex', true);
    const result = strategy(HashMocks.foobarHashes.original);
    expect(result).toBe(`md5[${HashMocks.foobarHashes.md5.hex}]`);
  });
});
