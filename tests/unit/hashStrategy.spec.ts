import { HashStrategy, Strategy } from '../../src/strategies';
import { HashMocks } from '../mocks';
import { CalculatedHash, ENCODINGS } from '../mocks/hashes';

describe('HashStrategy', () => {
  const commonlySupportedAlgos = [
    'md5',
    'sha256',
    'sha512',
    'sha3-256',
    'sha3-512'
  ];

  it('Throws an exception when an invalid hashing algorithm provided in constructor', () => {
    expect(() => {
      new HashStrategy('foobar');
    }).toThrow();
  });

  it('Can create a HashStrategy with a variety of supported algorithms', () => {


    commonlySupportedAlgos.forEach((algo: string) => {
      expect(() => new HashStrategy(algo)).not.toThrow();
    });
  });

  it('Can get the name of the hash strategy', () => {
    commonlySupportedAlgos.forEach((algo) => {
      ENCODINGS.forEach((encoding) => {
        const strategy = new HashStrategy(algo, encoding);
        expect(strategy.getName()).toBe(`${algo}_${encoding}`);
      });
    });
  });

  it('Can perform md5 hashing on a variety of values with all digest outputs', () => {
    ENCODINGS.forEach((encoding) => {
      const strategy: Strategy = new HashStrategy('md5', encoding);
      HashMocks.calculatedHashes.forEach((calculatedHash: CalculatedHash) => {
        const result = strategy.execute(calculatedHash.original);
        expect(result).toBe(calculatedHash.md5[encoding]);
      });
    });
  });
});
