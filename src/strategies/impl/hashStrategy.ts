import * as crypto from 'crypto';
import { Strategy } from '../strategy';
import { BinaryToTextEncoding, HASH_STRATEGIES } from '../../types';
import { HashStrategyConfig } from '../../types/config';
import { TypeCheckers } from '../../utils/typeCheckers';

export class HashStrategy implements Strategy {
  public static DEFAULT_HASH_ENCODING: BinaryToTextEncoding = 'hex';
  private readonly algorithm: HASH_STRATEGIES;
  private readonly encoding: BinaryToTextEncoding;
  private readonly shouldFormat: boolean;
  constructor(config: HashStrategyConfig) {
    if (!TypeCheckers.isHashStrategyConfig(config)) {
      throw new Error('Invalid configuration provided for Hash Strategy.');
    }

    const { algorithm, encoding, shouldFormat } = config;
    this.algorithm = algorithm;
    this.encoding = encoding || HashStrategy.DEFAULT_HASH_ENCODING;
    this.shouldFormat = shouldFormat || false;

    if (!crypto.getHashes().includes(algorithm)) {
      throw new Error(
        `Hashing algorithm ${algorithm} is not supported by Node.js crypto.`
      );
    }
  }

  public execute(value: string): string {
    const hash = crypto
      .createHash(this.algorithm)
      .update(value)
      .digest(this.encoding);
    if (!this.shouldFormat) {
      return hash;
    }

    return `${this.algorithm}[${hash}]`;
  }

  public getName(): string {
    return this.algorithm;
  }
}
