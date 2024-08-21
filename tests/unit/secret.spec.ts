import { SecretParserImpl, SecretParser } from '../../src/secrets';
import { SECRET_KEYS } from '../../src/secrets/secretKeys';
import { commonSecretKeys } from '../mocks/secrets';

describe('secret', () => {
  it('Default secret list redacts against common secret keys', () => {
    const secret: SecretParser = new SecretParserImpl(SECRET_KEYS);
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

  it('Allows users to specify ignored keys which override the secret keys', () => {
    const secret: SecretParser = new SecretParserImpl(SECRET_KEYS, [/fullname/]);

    Object.keys(commonSecretKeys).forEach((key) => {
      if (secret.isIgnored(key)) {
        expect(secret.isSecret(key)).toBeFalsy();
      } else {
        expect(secret.isSecret(key)).toBeTruthy();
      }
    });
  });
});
