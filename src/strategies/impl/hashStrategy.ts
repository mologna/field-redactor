import * as crypto from 'crypto';
import { Strategy } from '../strategy';
import { BinaryToTextEncoding } from '../../types';

export class HashStrategy implements Strategy {
  public static DEFAULT_HASH_ENCODING: BinaryToTextEncoding = 'hex';
  constructor(
    private readonly algorithm: string,
    private readonly encoding: BinaryToTextEncoding = HashStrategy.DEFAULT_HASH_ENCODING
  ) {
    if (!crypto.getHashes().includes(algorithm)) {
      throw new Error(
        `Hashing algorithm ${algorithm} is not supported by Node.js crypto.`
      );
    }
  }

  public execute(value: string): string {
    return crypto
      .createHash(this.algorithm)
      .update(value)
      .digest(this.encoding);
  }

  public getName(): string {
    return this.algorithm;
  }
}
