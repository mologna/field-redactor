import { Secret } from '../../src/secrets/secret';

describe('secret', () => {
  const commonSecretKeys: { [key: string]: string } = {
    password: 'test',
    pass: 'test',
    pw: 'test',
    secret: 'test',
    token: 'test',
    apikey: 'test',
    mdn: 'test',
    phone: '6152431111',
    first: 'a name',
    last: 'a name',
    address: 'an address',
    line: 'a line',
    email: 'first.last@example.com',
    fullname: 'a full name',
    authkey: 'a key',
    appAuthKey: 'a key',
    imei: 'a number',
    auth: 'an auth',
    security: 'some secret',
    account: 'some account value',
    identifier: 'some unique identifier',
    pin: '123456',
    key: 'a key',
    sessionid: 'an id'
  };

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
