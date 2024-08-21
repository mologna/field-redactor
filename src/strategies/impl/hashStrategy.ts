import * as crypto from 'crypto';
import { Strategy } from '../strategy';

export class HashStrategy implements Strategy {
  constructor(
    private readonly algorithm: string,
    private readonly encoding: crypto.BinaryToTextEncoding = 'hex'
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
