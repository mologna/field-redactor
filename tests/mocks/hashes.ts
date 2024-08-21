import * as crypto from 'crypto';
import { BinaryToTextEncoding } from "crypto";
import { HASH_STRATEGIES } from '../../src/strategies';

export const ENCODINGS: BinaryToTextEncoding[] = ['hex', 'base64', 'base64url', 'binary'] as const;
export const algorithmsToCheck = ['md5', 'sha256', 'sha3-256', 'RSA-MD5', 'RSA-SHA3-256', 'RSA-SHA256'] as const;
export type Algorithms = typeof algorithmsToCheck[number];
type CalculatedHashResult = Record<typeof ENCODINGS[number], string>;
type CalculatedHashResults = Record<typeof algorithmsToCheck[number], CalculatedHashResult>;

export type CalculatedHash = CalculatedHashResults & {
  original: string;
};

const foobarOriginal = 'foobar';
const helloWorldOriginal = 'Hello, World';
const stringifiedObjectOriginal = '{"foo":"bar","biz":["baz",1,"bop"]}';

/**
 * Generates hashes with all encodings for the given text and algorithm. Used as a utility 
 * for generating test output.
 * @param text The text to generate hashes for
 * @param algorithm The algorithm to use
 */
const hashGenerator = (text: string, algorithm: HASH_STRATEGIES) => {
  return ENCODINGS.reduce((prev: Partial<CalculatedHashResult>, encoding: BinaryToTextEncoding) => {
    return {
      ...prev,
      [encoding]: crypto.createHash(algorithm).update(text).digest(encoding)
    }
  }, {})
}

/**
 * 
 * @param text The text to generate hashes for
 * @returns Generates hashes for all algorithms we wish to test for.
 */
const calculatedHashGenerator = (text: string): CalculatedHash => {
  return algorithmsToCheck.reduce((prev: any, algorithm: Algorithms) => {
    return {
      ...prev,
      [algorithm]: hashGenerator(text, algorithm)
    }
  }, {original: text});
}



export const foobarHashes: CalculatedHash = calculatedHashGenerator(foobarOriginal);
export const helloWorldHashes: CalculatedHash = calculatedHashGenerator(helloWorldOriginal);
export const stringifiedObjectHashes: CalculatedHash = calculatedHashGenerator(stringifiedObjectOriginal);

export const calculatedHashes: CalculatedHash[] = [
  foobarHashes,
  helloWorldHashes,
  stringifiedObjectHashes
];

