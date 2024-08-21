import { HashStrategy, Strategy, hashStrategies } from '../../src/strategies';
import { HashMocks } from '../mocks';
import { Algorithms, CalculatedHash, ENCODINGS, algorithmsToCheck } from '../mocks/hashes';

describe('HashStrategy', () => {
  it('Throws an exception when an invalid hashing algorithm provided in constructor', () => {
    expect(() => {
      new HashStrategy('foobar');
    }).toThrow();
  });

  it('Can create a HashStrategy with a variety of supported algorithms', () => {
    hashStrategies.forEach((algo: string) => {
      expect(() => new HashStrategy(algo)).not.toThrow();
    });
  });

  it('Can get the name of the hash strategy', () => {
    hashStrategies.forEach((algo) => {
      ENCODINGS.forEach((encoding) => {
        const strategy = new HashStrategy(algo, encoding);
        expect(strategy.getName()).toBe(algo);
      });
    });
  });

  const checkAllEncodingsForAlgorithm = (algorithm: Algorithms) => {
    ENCODINGS.forEach((encoding) => {
      const strategy: Strategy = new HashStrategy(algorithm, encoding);
      HashMocks.calculatedHashes.forEach((calculatedHash: CalculatedHash) => {
        const result = strategy.execute(calculatedHash.original);
        expect(result).toBe(calculatedHash[algorithm][encoding]);
      });
    });  
  }

  it('Can hash using a variety of supported algorithms on different values with all digest outputs', () => {
    algorithmsToCheck.forEach((algorithm: Algorithms) => {
      checkAllEncodingsForAlgorithm(algorithm);
    })
  });
});
