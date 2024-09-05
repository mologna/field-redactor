import * as crypto from 'crypto';
import { FunctionalStrategy } from '../functionalStrategy';
import { BinaryToTextEncoding, HASH_STRATEGIES } from '../../types';

export const getHashStrategy = (algorithm: HASH_STRATEGIES, encoding?: BinaryToTextEncoding, shouldFormat?: boolean): FunctionalStrategy => {
  if (!crypto.getHashes().includes(algorithm)) {
    throw new Error(
      `Hashing algorithm ${algorithm} is not supported by Node.js crypto.`
    );
  }
  encoding = encoding || 'hex';
  shouldFormat = !!shouldFormat

  return (value: string) => {
    const hash = crypto
    .createHash(algorithm)
    .update(value)
    .digest(encoding);
    if (!shouldFormat) {
      return hash;
    }

    return `${algorithm}[${hash}]`;  
  }
}
