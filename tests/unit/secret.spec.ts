import { SecretParserImpl, SecretParser } from '../../src/secrets';
import { DEFAULT_SECRET_KEYS } from '../../src/values/secretKeys';
import { commonSecretKeys } from '../mocks/secrets';

describe('secret', () => {
  it('Default secret list redacts against common secret keys', () => {
    const secret: SecretParser = new SecretParserImpl(DEFAULT_SECRET_KEYS);
    Object.keys(commonSecretKeys).forEach((key) => {
      expect(secret.isSecret(key)).toBeTruthy();
    });
  });

  it('Allows users to specify their own secret keys', () => {
    const secret: SecretParser = new SecretParserImpl([/foobar/]);

    expect(secret.isSecret('foobar')).toBeTruthy();
    Object.keys(commonSecretKeys).forEach((key) => {
      expect(secret.isSecret(key)).toBeFalsy();
    });
  });

  it('Allows users to specify ignored keys', () => {
    const secret: SecretParser = new SecretParserImpl(DEFAULT_SECRET_KEYS, [
      /fullname/
    ]);
    expect(secret.isIgnored('fullname')).toBeTruthy();
  });
});
