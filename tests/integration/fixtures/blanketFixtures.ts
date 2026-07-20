import * as crypto from 'crypto';
import { CustomObject, CustomObjectMatchType, Redactor, RedactorInput } from '../../../src';
import {
  mockClientName,
  mockEmail,
  mockFirstName,
  mockLastName,
  mockOwner,
  mockUserId
} from '../../mocks/cryptoMockValues';

export const secretKeys = [
  /email/,
  /mdn/,
  /balance/,
  /address/,
  /city/,
  /fullname/i,
  /firstName/i,
  /lastName/i,
  /client/i,
  /owner/i,
  /nullkey/i,
  /undefinedkey/i,
  /booleankey/i,
  /userid/i,
  /password/i
];
export const deepSecretKeys = [/^user$/, /deepRedactMe/i];
export const fullSecretKeys = [/account/];
export const deleteSecretKeys = [/authKey/i, /authenticationKey/i];

export const fullCustomObject: CustomObject = {
  ignore: CustomObjectMatchType.Ignore,
  pass: CustomObjectMatchType.Pass,
  shallow: CustomObjectMatchType.Shallow,
  deep: CustomObjectMatchType.Deep,
  full: CustomObjectMatchType.Full,
  delete: CustomObjectMatchType.Delete,
  secretName: CustomObjectMatchType.Ignore,
  deepSecretName: CustomObjectMatchType.Ignore,
  fullSecretName: CustomObjectMatchType.Ignore,
  deleteSecretName: CustomObjectMatchType.Ignore,
  secretValue: 'secretName',
  deepSecretValue: 'deepSecretName',
  fullSecretValue: 'fullSecretName',
  deleteSecretValue: 'deleteSecretName'
};

export const smallCustomObject: CustomObject = {
  key: CustomObjectMatchType.Ignore,
  value: 'key'
};

export const mediumCustomObject: CustomObject = {
  key: CustomObjectMatchType.Ignore,
  metadata: CustomObjectMatchType.Pass,
  type: CustomObjectMatchType.Ignore,
  value: 'key'
};

export const blanketDataToRedact = {
  '@timestamp': '2024-12-01T22:07:26.448Z',
  level: 'info',
  appId: 271,
  // delete secret keys which should be redacted
  appAuthKey: '12345',
  // secret keys which should be redacted
  clientName: mockClientName,
  owner: mockOwner,
  nullKey: null,
  undefinedKey: undefined,
  trueBooleanKey: true,
  falseBooleanKey: false,
  deepRedactMe: [
    mockEmail,
    {
      a: mockEmail
    },
    {
      key: 'dontRedactMe',
      value: mockEmail
    },
    [mockEmail]
  ],
  // deep secret keys which should be redacted
  // include arrays in objects and objects in arrays for testing
  user: {
    id: mockUserId,
    a: mockFirstName,
    b: mockLastName,
    c: [mockFirstName, { b: mockLastName }],
    d: {
      first: mockFirstName,
      last: mockLastName,
      full: [mockFirstName, mockLastName]
    }
  },
  // full secret keys which should be redacted
  account: {
    foo: 'bar'
  },
  // custom object value where all values are primitives and secrets are hits
  customWithPrimitives: {
    ignore: mockFirstName,
    pass: mockFirstName,
    shallow: mockFirstName,
    deep: mockFirstName,
    full: mockFirstName,
    delete: mockFirstName,
    secretName: 'email',
    deepSecretName: 'user',
    fullSecretName: 'account',
    deleteSecretName: 'authKey',
    secretValue: mockEmail,
    deepSecretValue: mockEmail,
    fullSecretValue: mockEmail,
    deleteSecretValue: '12345'
  },
  // custom object where all values are primitives and secrets are misses
  customWithPrimitivesAndSecretMisses: {
    ignore: mockFirstName,
    pass: mockFirstName,
    shallow: mockFirstName,
    deep: mockFirstName,
    full: mockFirstName,
    delete: mockFirstName,
    secretName: 'foo',
    deepSecretName: 'foo',
    fullSecretName: 'foo',
    deleteSecretName: 'foo',
    secretValue: mockEmail,
    deepSecretValue: mockEmail,
    fullSecretValue: mockEmail,
    deleteSecretValue: mockEmail
  },
  // custom object where all values are objects and secrets are hits
  customWithObjects: {
    ignore: {
      email: mockEmail
    },
    pass: {
      email: mockEmail,
      foo: mockEmail
    },
    shallow: {
      email: mockEmail,
      foo: mockEmail
    },
    deep: {
      email: mockEmail,
      foo: mockEmail
    },
    full: {
      email: mockEmail,
      foo: mockEmail
    },
    delete: {
      foo: "bar"
    },
    secretName: 'email',
    deepSecretName: 'user',
    fullSecretName: 'account',
    deleteSecretName: 'authKey',
    secretValue: {
      email: mockEmail,
      foo: mockEmail
    },
    deepSecretValue: {
      email: mockEmail,
      foo: mockEmail
    },
    fullSecretValue: {
      email: mockEmail,
      foo: mockEmail
    },
    deleteSecretValue: {
      email: mockEmail,
      foo: mockEmail
    }
  },
  // custom object where all values are arrays and secrets are hits
  customWithArrays: {
    ignore: [mockEmail],
    pass: [mockEmail],
    shallow: [mockEmail],
    deep: [mockEmail],
    full: [mockEmail],
    delete: [mockEmail],
    secretName: 'email',
    deepSecretName: 'user',
    fullSecretName: 'account',
    deleteSecretName: 'authKey',
    secretValue: [mockEmail],
    deepSecretValue: [mockEmail],
    fullSecretValue: [mockEmail],
    deleteSecretValue: [mockEmail]
  }
};

export const NULL_OR_UNDEFINED_TEXT = 'REDACTED_NULL_OR_UNDEFINED';

export const redactor: Redactor = (val: RedactorInput) => {
  if (val === null || val === undefined) {
    return Promise.resolve(NULL_OR_UNDEFINED_TEXT);
  }
  return Promise.resolve(crypto.createHash('sha256').update(val.toString()).digest('hex'));
};

