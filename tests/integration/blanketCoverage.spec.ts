import * as crypto from 'crypto';
import { FieldRedactor, CustomObject, CustomObjectMatchType, Redactor } from '../../src';
import {
  mockClientName,
  mockEmail,
  mockFirstName,
  mockLastName,
  mockMdn,
  mockOwner,
  mockUserId,
  sha256HashedEmail,
  sha256HashedFalse,
  sha256HashedFirstName,
  sha256HashedLastName,
  sha256HashedMdn,
  sha256HashedMockClientName,
  sha256HashedOwner,
  sha256HashedTrue,
  sha256HashedUserId
} from '../mocks/cryptoMockValues';

const secretKeys = [
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
const deepSecretKeys = [/^user$/, /deepRedactMe/i];
const fullSecretKeys = [/account/];
const deleteSecretKeys = [/authKey/i, /authenticationKey/i];

export const fullCustomObject: CustomObject = {
  ignore: CustomObjectMatchType.Ignore,
  pass: CustomObjectMatchType.Pass,
  shallow: CustomObjectMatchType.Shallow,
  deep: CustomObjectMatchType.Deep,
  full: CustomObjectMatchType.Full,
  secretName: CustomObjectMatchType.Ignore,
  deepSecretName: CustomObjectMatchType.Ignore,
  fullSecretName: CustomObjectMatchType.Ignore,
  deleteSecretName: CustomObjectMatchType.Ignore,
  secretValue: 'secretName',
  deepSecretValue: 'deepSecretName',
  fullSecretValue: 'fullSecretName',
  deleteSecretValue: 'deleteSecretName'
};

const smallCustomObject: CustomObject = {
  key: CustomObjectMatchType.Ignore,
  value: 'key'
};

const mediumCustomObject: CustomObject = {
  key: CustomObjectMatchType.Ignore,
  metadata: CustomObjectMatchType.Pass,
  type: CustomObjectMatchType.Ignore,
  value: 'key'
};

const blanketDataToRedact = {
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

const NULL_OR_UNDEFINED_TEXT = 'REDACTED_NULL_OR_UNDEFINED';

const redactor: Redactor = (val: any) => {
  if (val === null || val === undefined) {
    return Promise.resolve(NULL_OR_UNDEFINED_TEXT);
  }
  return Promise.resolve(crypto.createHash('sha256').update(val.toString()).digest('hex'));
};

describe('Blanket Coverage Integration Tests', () => {
  it('Can handle a blanket suite of integration tests with all configuration options specified', async () => {
    const fieldRedactor = new FieldRedactor({
      redactor,
      secretKeys,
      deepSecretKeys,
      fullSecretKeys,
      deleteSecretKeys,
      customObjects: [fullCustomObject, smallCustomObject],
      ignoreNullOrUndefined: false,
      ignoreBooleans: false
    });

    const result = await fieldRedactor.redact(blanketDataToRedact);

    // non-secrets should not be redacted
    expect(result['@timestamp']).toBe(blanketDataToRedact['@timestamp']);
    expect(result.level).toBe(blanketDataToRedact.level);
    expect(result.appId).toBe(blanketDataToRedact.appId);
    expect(result.appAuthKey).toBeUndefined();
    expect(result.nullKey).toBe(NULL_OR_UNDEFINED_TEXT);
    expect(result.undefinedKey).toBe(NULL_OR_UNDEFINED_TEXT);
    expect(result.trueBooleanKey).toBe(sha256HashedTrue);
    expect(result.falseBooleanKey).toBe(sha256HashedFalse);
    expect(result.deepRedactMe[0]).toBe(sha256HashedEmail);
    expect(result.deepRedactMe[1].a).toBe(sha256HashedEmail);
    expect(result.deepRedactMe[2].key).toBe('dontRedactMe');
    expect(result.deepRedactMe[2].value).toBe(mockEmail);
    expect(result.deepRedactMe[3][0]).toBe(sha256HashedEmail);

    // secrets should be redacted
    expect(result.clientName).toBe(sha256HashedMockClientName);
    expect(result.owner).toBe(sha256HashedOwner);

    // deep secrets should have all nested data redacted
    expect(result.user.id).toBe(sha256HashedUserId);
    expect(result.user.a).toBe(sha256HashedFirstName);
    expect(result.user.b).toBe(sha256HashedLastName);
    expect(result.user.c[0]).toBe(sha256HashedFirstName);
    expect(result.user.c[1].b).toBe(sha256HashedLastName);
    expect(result.user.d.first).toBe(sha256HashedFirstName);
    expect(result.user.d.last).toBe(sha256HashedLastName);
    expect(result.user.d.full[0]).toBe(sha256HashedFirstName);
    expect(result.user.d.full[1]).toBe(sha256HashedLastName);

    // full secrets should be stringified and redacted
    expect(result.account).toBe(
      crypto.createHash('sha256').update(JSON.stringify(blanketDataToRedact.account)).digest('hex')
    );

    // custom object primitive values should be redacted according to correct rules
    expect(result.customWithPrimitives.ignore).toBe(mockFirstName);
    expect(result.customWithPrimitives.pass).toBe(mockFirstName);
    expect(result.customWithPrimitives.shallow).toBe(sha256HashedFirstName);
    expect(result.customWithPrimitives.deep).toBe(sha256HashedFirstName);
    expect(result.customWithPrimitives.full).toBe(sha256HashedFirstName);
    expect(result.customWithPrimitives.secretName).toBe(blanketDataToRedact.customWithPrimitives.secretName);
    expect(result.customWithPrimitives.deepSecretName).toBe(blanketDataToRedact.customWithPrimitives.deepSecretName);
    expect(result.customWithPrimitives.fullSecretName).toBe(blanketDataToRedact.customWithPrimitives.fullSecretName);
    expect(result.customWithPrimitives.secretValue).toBe(sha256HashedEmail);
    expect(result.customWithPrimitives.deepSecretValue).toBe(sha256HashedEmail);
    expect(result.customWithPrimitives.fullSecretValue).toBe(sha256HashedEmail);

    // custom objects with secret misses shouldn't be touched
    expect(result.customWithPrimitivesAndSecretMisses.secretValue).toBe(mockEmail);
    expect(result.customWithPrimitivesAndSecretMisses.deepSecretValue).toBe(mockEmail);
    expect(result.customWithPrimitivesAndSecretMisses.fullSecretValue).toBe(mockEmail);

    // custom objects with objects as values should be redacted according to the specified ruleset or secret type
    expect(result.customWithObjects.ignore.email).toBe(mockEmail);
    expect(result.customWithObjects.pass.email).toBe(sha256HashedEmail);
    expect(result.customWithObjects.pass.foo).toBe(mockEmail);
    expect(result.customWithObjects.shallow.email).toBe(sha256HashedEmail);
    expect(result.customWithObjects.shallow.foo).toBe(mockEmail);
    expect(result.customWithObjects.deep.email).toBe(sha256HashedEmail);
    expect(result.customWithObjects.deep.foo).toBe(sha256HashedEmail);
    expect(result.customWithObjects.full).toBe(
      crypto.createHash('sha256').update(JSON.stringify(blanketDataToRedact.customWithObjects.full)).digest('hex')
    );
    expect(result.customWithObjects.secretName).toBe(blanketDataToRedact.customWithObjects.secretName);
    expect(result.customWithObjects.deepSecretName).toBe(blanketDataToRedact.customWithObjects.deepSecretName);
    expect(result.customWithObjects.fullSecretName).toBe(blanketDataToRedact.customWithObjects.fullSecretName);

    expect(result.customWithObjects.secretName).toBe(blanketDataToRedact.customWithObjects.secretName);
    expect(result.customWithObjects.deepSecretName).toBe(blanketDataToRedact.customWithObjects.deepSecretName);
    expect(result.customWithObjects.fullSecretName).toBe(blanketDataToRedact.customWithObjects.fullSecretName);

    expect(result.customWithObjects.secretValue.email).toBe(sha256HashedEmail);
    expect(result.customWithObjects.secretValue.foo).toBe(mockEmail);
    expect(result.customWithObjects.deepSecretValue.email).toBe(sha256HashedEmail);
    expect(result.customWithObjects.deepSecretValue.foo).toBe(sha256HashedEmail);
    expect(result.customWithObjects.fullSecretValue).toBe(
      crypto
        .createHash('sha256')
        .update(JSON.stringify(blanketDataToRedact.customWithObjects.fullSecretValue))
        .digest('hex')
    );

    // custom objects with values as arrays should be redacted according to the specified ruleset or secret type
    expect(result.customWithArrays.ignore[0]).toBe(mockEmail);
    expect(result.customWithArrays.pass[0]).toBe(mockEmail);
    expect(result.customWithArrays.shallow[0]).toBe(sha256HashedEmail);
    expect(result.customWithArrays.deep[0]).toBe(sha256HashedEmail);
    expect(result.customWithArrays.full).toBe(
      crypto
        .createHash('sha256')
        .update(JSON.stringify(blanketDataToRedact.customWithArrays.fullSecretValue))
        .digest('hex')
    );
    expect(result.customWithArrays.secretName).toBe(blanketDataToRedact.customWithArrays.secretName);
    expect(result.customWithArrays.deepSecretName).toBe(blanketDataToRedact.customWithArrays.deepSecretName);
    expect(result.customWithArrays.fullSecretName).toBe(blanketDataToRedact.customWithArrays.fullSecretName);
    expect(result.customWithArrays.secretValue[0]).toBe(sha256HashedEmail);
    expect(result.customWithArrays.deepSecretValue[0]).toBe(sha256HashedEmail);
    expect(result.customWithArrays.fullSecretValue).toBe(
      crypto
        .createHash('sha256')
        .update(JSON.stringify(blanketDataToRedact.customWithArrays.fullSecretValue))
        .digest('hex')
    );
  });

  it('Can handle root-level custom objects as well as object values with nested arrays', async () => {
    const fieldRedactor = new FieldRedactor({
      redactor,
      secretKeys,
      deepSecretKeys,
      fullSecretKeys,
      deleteSecretKeys,
      customObjects: [fullCustomObject]
    });

    const rootLevelArraysInObjectsCustomObject = {
      ignore: {
        a: [mockEmail],
        email: [mockEmail]
      },
      pass: {
        a: [mockEmail],
        email: [mockEmail]
      },
      shallow: {
        a: [mockEmail],
        email: [mockEmail]
      },
      deep: {
        a: [mockEmail],
        email: [mockEmail]
      },
      full: {
        a: [mockEmail],
        email: [mockEmail]
      },
      secretName: 'email',
      deepSecretName: 'user',
      fullSecretName: 'account',
      deleteSecretName: 'authKey',
      secretValue: {
        a: [mockEmail],
        email: [mockEmail]
      },
      deepSecretValue: {
        a: [mockEmail],
        email: [mockEmail]
      },
      fullSecretValue: {
        a: [mockEmail],
        email: [mockEmail]
      },
      deleteSecretValue: {
        a: [mockEmail],
        b: [mockEmail]
      }
    };

    const result = await fieldRedactor.redact(rootLevelArraysInObjectsCustomObject);

    expect(result.ignore.a[0]).toBe(mockEmail);
    expect(result.pass.a[0]).toBe(mockEmail);
    expect(result.pass.email[0]).toBe(sha256HashedEmail);
    expect(result.shallow.a[0]).toBe(mockEmail);
    expect(result.shallow.email[0]).toBe(sha256HashedEmail);
    expect(result.deep.a[0]).toBe(sha256HashedEmail);
    expect(result.deep.email[0]).toBe(sha256HashedEmail);
    expect(result.full).toBe(
      crypto.createHash('sha256').update(JSON.stringify(rootLevelArraysInObjectsCustomObject.full)).digest('hex')
    );

    expect(result.secretName).toBe(rootLevelArraysInObjectsCustomObject.secretName);
    expect(result.deepSecretName).toBe(rootLevelArraysInObjectsCustomObject.deepSecretName);
    expect(result.fullSecretName).toBe(rootLevelArraysInObjectsCustomObject.fullSecretName);
    expect(result.deleteSecretName).toBe(rootLevelArraysInObjectsCustomObject.deleteSecretName);

    expect(result.secretValue.a[0]).toBe(mockEmail);
    expect(result.secretValue.email[0]).toBe(sha256HashedEmail);
    expect(result.deepSecretValue.a[0]).toBe(sha256HashedEmail);
    expect(result.deepSecretValue.email[0]).toBe(sha256HashedEmail);
    expect(result.fullSecretValue).toBe(
      crypto
        .createHash('sha256')
        .update(JSON.stringify(rootLevelArraysInObjectsCustomObject.fullSecretValue))
        .digest('hex')
    );
    expect(result.deleteSecretValue).toBeUndefined();
  });

  it('Can handle root-level custom objects as well as array values with nested objects', async () => {
    const fieldRedactor = new FieldRedactor({
      redactor,
      secretKeys,
      deepSecretKeys,
      fullSecretKeys,
      deleteSecretKeys,
      customObjects: [fullCustomObject]
    });

    const rootLevelArraysInObjectsCustomObject = {
      ignore: [{ a: mockEmail, email: mockEmail }],
      pass: [{ a: mockEmail, email: mockEmail }],
      shallow: [{ a: mockEmail, email: mockEmail }],
      deep: [{ a: mockEmail, email: mockEmail }],
      full: [{ a: mockEmail, email: mockEmail }],
      secretName: 'email',
      deepSecretName: 'user',
      fullSecretName: 'account',
      deleteSecretName: 'authKey',
      secretValue: [{ a: mockEmail, email: mockEmail }],
      deepSecretValue: [{ a: mockEmail, email: mockEmail }],
      fullSecretValue: [{ a: mockEmail, email: mockEmail }],
      deleteSecretValue: [{ a: mockEmail, email: mockEmail }]
    };

    const result = await fieldRedactor.redact(rootLevelArraysInObjectsCustomObject);

    expect(result.ignore[0].a).toBe(mockEmail);
    expect(result.ignore[0].email).toBe(mockEmail);
    expect(result.pass[0].a).toBe(mockEmail);
    expect(result.pass[0].email).toBe(sha256HashedEmail);
    expect(result.shallow[0].a).toBe(mockEmail);
    expect(result.shallow[0].email).toBe(sha256HashedEmail);
    expect(result.deep[0].a).toBe(sha256HashedEmail);
    expect(result.deep[0].email).toBe(sha256HashedEmail);
    expect(result.full).toBe(
      crypto.createHash('sha256').update(JSON.stringify(rootLevelArraysInObjectsCustomObject.full)).digest('hex')
    );

    expect(result.secretName).toBe(rootLevelArraysInObjectsCustomObject.secretName);
    expect(result.deepSecretName).toBe(rootLevelArraysInObjectsCustomObject.deepSecretName);
    expect(result.fullSecretName).toBe(rootLevelArraysInObjectsCustomObject.fullSecretName);
    expect(result.deleteSecretName).toBe(rootLevelArraysInObjectsCustomObject.deleteSecretName);

    expect(result.secretValue[0].a).toBe(mockEmail);
    expect(result.secretValue[0].email).toBe(sha256HashedEmail);
    expect(result.deepSecretValue[0].a).toBe(sha256HashedEmail);
    expect(result.deepSecretValue[0].email).toBe(sha256HashedEmail);
    expect(result.fullSecretValue).toBe(
      crypto
        .createHash('sha256')
        .update(JSON.stringify(rootLevelArraysInObjectsCustomObject.fullSecretValue))
        .digest('hex')
    );
    expect(result.deleteSecretValue).toBeUndefined();
  });

  it('Can handle more realistic scenarios where multiple custom objects are specified with various input parameters', async () => {
    const fieldRedactor = new FieldRedactor({
      redactor,
      secretKeys,
      deepSecretKeys,
      fullSecretKeys,
      customObjects: [smallCustomObject, mediumCustomObject]
    });

    const input = {
      '@timestamp': '2024-12-01T22:07:26.448Z',
      level: 'info',
      appId: 271,
      // secret keys which should be redacted
      clientName: mockClientName,
      owner: mockOwner,
      data: [
        {
          key: 'email',
          value: mockEmail
        },
        {
          key: 'foo',
          value: 'bar'
        },
        {
          key: 'mdn',
          value: mockMdn
        }
      ],
      actions: [
        {
          key: 'account',
          metadata: {
            time: '2024-12-01T22:07:26.448Z',
            userId: mockUserId,
            action: 'login'
          },
          type: 'data',
          value: {
            this: 'should be fully redacted'
          }
        },
        {
          key: 'user',
          metadata: {
            time: '2024-12-01T22:07:26.448Z',
            userId: mockUserId,
            action: 'login'
          },
          type: 'data',
          value: mockEmail
        }
      ]
    };

    const result = await fieldRedactor.redact(input);

    expect(result.clientName).toBe(sha256HashedMockClientName);
    expect(result.owner).toBe(sha256HashedOwner);
    expect(result.data[0].key).toBe('email');
    expect(result.data[0].value).toBe(sha256HashedEmail);
    expect(result.data[1].key).toBe('foo');
    expect(result.data[1].value).toBe('bar');
    expect(result.data[2].key).toBe('mdn');
    expect(result.data[2].value).toBe(sha256HashedMdn);

    expect(result.actions[0].key).toBe('account');
    expect(result.actions[0].metadata.time).toBe(input.actions[0].metadata.time);
    expect(result.actions[0].metadata.userId).toBe(sha256HashedUserId);
    expect(result.actions[0].metadata.action).toBe(input.actions[0].metadata.action);
    expect(result.actions[0].type).toBe(input.actions[0].type);
    expect(result.actions[0].value).toBe(
      crypto.createHash('sha256').update(JSON.stringify(input.actions[0].value)).digest('hex')
    );
    expect(result.actions[1].key).toBe('user');
    expect(result.actions[1].metadata.time).toBe(input.actions[1].metadata.time);
    expect(result.actions[1].metadata.userId).toBe(sha256HashedUserId);
    expect(result.actions[1].metadata.action).toBe(input.actions[1].metadata.action);
    expect(result.actions[1].type).toBe(input.actions[0].type);
    expect(result.actions[1].value).toBe(sha256HashedEmail);
  });
});
