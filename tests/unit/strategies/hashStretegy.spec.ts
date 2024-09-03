import { Strategy, hashStrategies } from '../../../src/strategies';
import { HashStrategy } from '../../../src/strategies/impl/hashStrategy';
import { HashMocks } from '../../mocks';
import { binaryToTextEncoding, HASH_STRATEGIES } from '../../../src/types';
import {
  Algorithms,
  CalculatedHash,
  algorithmsToCheck
} from '../../mocks/hashes';
import { HashStrategyConfig } from '../../../src/types/config';
import { TypeCheckers } from '../../../src/utils/typeCheckers';

describe('configHashStrategy', () => {
  it('Throws an exception when an invalid config provided in constructor', () => {
    const spy = jest
      .spyOn(TypeCheckers, 'isHashStrategyConfig')
      .mockReturnValueOnce(false);
    const config: HashStrategyConfig = {
      type: 'hash',
      algorithm: 'md5'
    };
    expect(() => new HashStrategy(config)).toThrow(
      'Invalid configuration provided for Hash Strategy.'
    );
    spy.mockRestore();
  });

  it('Throws an error if crypto hashes does not include algorithm', () => {
    const algorithm = 'foobar';
    const spy = jest
      .spyOn(TypeCheckers, 'isHashStrategyConfig')
      .mockReturnValueOnce(true);
    const config: any = {
      type: 'hash',
      algorithm
    };
    expect(() => {
      new HashStrategy(config);
    }).toThrow(
      `Hashing algorithm ${algorithm} is not supported by Node.js crypto.`
    );
    spy.mockRestore();
  });

  it('Can create a HashStrategy with a variety of supported algorithms', () => {
    hashStrategies.forEach((algorithm: HASH_STRATEGIES) => {
      const config: HashStrategyConfig = { type: 'hash', algorithm };
      expect(() => new HashStrategy(config)).not.toThrow();
    });
  });

  const checkAllEncodingsForAlgorithm = (algorithm: Algorithms) => {
    binaryToTextEncoding.forEach((encoding) => {
      const config: HashStrategyConfig = {
        type: 'hash',
        algorithm,
        encoding
      };
      const strategy: Strategy = new HashStrategy(config);
      HashMocks.calculatedHashes.forEach((calculatedHash: CalculatedHash) => {
        const result = strategy.execute(calculatedHash.original);
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
    const config: HashStrategyConfig = {
      type: 'hash',
      algorithm: 'md5',
      shouldFormat: true
    };
    const strategy: Strategy = new HashStrategy(config);
    const result = strategy.execute(HashMocks.foobarHashes.original);
    expect(result).toBe(`md5[${HashMocks.foobarHashes.md5.hex}]`);
  });
});
