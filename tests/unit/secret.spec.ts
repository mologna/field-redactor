import { Secret } from '../../src/secrets/secret';
import { commonSecretKeys } from '../mocks/secrets';

describe('secret', () => {
  it('Default secret list redacts against common secret keys', () => {
    const secret: Secret = new Secret();
    Object.keys(commonSecretKeys).forEach((key) => {
      expect(secret.isSecretKey(key)).toBeTruthy();
    });
  });

  it('Allows users to specify their own secret keys', () => {
    const secret: Secret = new Secret({
      keys: [/foobar/]
    });

    expect(secret.isSecretKey('foobar')).toBeTruthy();
    Object.keys(commonSecretKeys).forEach((key) => {
      expect(secret.isSecretKey(key)).toBeFalsy();
    });
  });

  it('Allows users to specify ignored keys which override the secret keys', () => {
    const secret: Secret = new Secret({
      ignoredKeys: [/fullname/]
    });

    Object.keys(commonSecretKeys).forEach((key) => {
      if (secret.isIgnoredKey(key)) {
        expect(secret.isSecretKey(key)).toBeFalsy();
      } else {
        expect(secret.isSecretKey(key)).toBeTruthy();
      }
    });
  });
});
