export const hashStrategies = [
  'RSA-MD5',
  'RSA-RIPEMD160',
  'RSA-SHA1',
  'RSA-SHA1-2',
  'RSA-SHA224',
  'RSA-SHA256',
  'RSA-SHA3-224',
  'RSA-SHA3-256',
  'RSA-SHA3-384',
  'RSA-SHA3-512',
  'RSA-SHA384',
  'RSA-SHA512',
  'RSA-SHA512/224',
  'RSA-SHA512/256',
  'RSA-SM3',
  'blake2b512',
  'blake2s256',
  'id-rsassa-pkcs1-v1_5-with-sha3-224',
  'id-rsassa-pkcs1-v1_5-with-sha3-256',
  'id-rsassa-pkcs1-v1_5-with-sha3-384',
  'id-rsassa-pkcs1-v1_5-with-sha3-512',
  'md5',
  'md5-sha1',
  'md5WithRSAEncryption',
  'ripemd',
  'ripemd160',
  'ripemd160WithRSA',
  'rmd160',
  'sha1',
  'sha1WithRSAEncryption',
  'sha224',
  'sha224WithRSAEncryption',
  'sha256',
  'sha256WithRSAEncryption',
  'sha3-224',
  'sha3-256',
  'sha3-384',
  'sha3-512',
  'sha384',
  'sha384WithRSAEncryption',
  'sha512',
  'sha512-224',
  'sha512-224WithRSAEncryption',
  'sha512-256',
  'sha512-256WithRSAEncryption',
  'sha512WithRSAEncryption',
  'shake128',
  'shake256',
  'sm3',
  'sm3WithRSAEncryption',
  'ssl3-md5',
  'ssl3-sha1'
] as const;

export const redactionStrategies = [
  'redaction'
] as const;

export type HASH_STRATEGIES = typeof hashStrategies[number];
export type REDACTION_STRATEGY = typeof redactionStrategies[number];

export const isHashStrategy = (val: any): val is HASH_STRATEGIES => {
  return hashStrategies.includes(val);
}

export const isRedactionStrategy = (val: any): val is REDACTION_STRATEGY => {
  return redactionStrategies.includes(val); 
}

export type STRATEGIES = HASH_STRATEGIES | REDACTION_STRATEGY;
