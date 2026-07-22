import * as crypto from 'crypto';
import { FieldRedactor, JsonArray, JsonObject } from '../../src';
import {
  mockClientName,
  mockEmail,
  mockFirstName,
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
import {
  blanketDataToRedact,
  deepSecretKeys,
  removeSecretKeys,
  fullCustomObject,
  opaqueSecretKeys,
  mediumCustomObject,
  NULL_OR_UNDEFINED_TEXT,
  redactor,
  secretKeys,
  smallCustomObject
} from './fixtures/blanketFixtures';

describe('Blanket Coverage Integration Tests', () => {
  it('Can handle a blanket suite of integration tests with all configuration options specified', async () => {
    const fieldRedactor = new FieldRedactor({
      redactor,
      secretKeys,
      deepSecretKeys,
      opaqueSecretKeys,
      removeSecretKeys,
      customObjects: [fullCustomObject, smallCustomObject],
      ignoreNullOrUndefined: false,
      ignoreBooleans: false
    });

    const result = await fieldRedactor.redact(blanketDataToRedact) as typeof blanketDataToRedact;

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
    expect((result.deepRedactMe[1] as JsonObject).a).toBe(sha256HashedEmail);
    expect((result.deepRedactMe[2] as JsonObject).key).toBe('dontRedactMe');
    expect((result.deepRedactMe[2] as JsonObject).value).toBe(mockEmail);
    expect((result.deepRedactMe[3] as JsonArray)[0]).toBe(sha256HashedEmail);

    // secrets should be redacted
    expect(result.clientName).toBe(sha256HashedMockClientName);
    expect(result.owner).toBe(sha256HashedOwner);

    // deep secrets should have all nested data redacted
    expect(result.user.id).toBe(sha256HashedUserId);
    expect(result.user.a).toBe(sha256HashedFirstName);
    expect(result.user.b).toBe(sha256HashedLastName);
    expect(result.user.c[0]).toBe(sha256HashedFirstName);
    expect((result.user.c[1] as JsonObject).b).toBe(sha256HashedLastName);
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
    expect(result.customWithPrimitives.delete).toBeUndefined();
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
    expect(result.customWithObjects.delete).toBeUndefined();
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
    expect(result.customWithArrays.delete).toBeUndefined();
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
      opaqueSecretKeys,
      removeSecretKeys,
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
      delete: {
        a: [mockEmail]
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
    expect(result.delete).toBeUndefined();

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
      opaqueSecretKeys,
      removeSecretKeys,
      customObjects: [fullCustomObject]
    });

    const rootLevelArraysInObjectsCustomObject = {
      ignore: [{ a: mockEmail, email: mockEmail }],
      pass: [{ a: mockEmail, email: mockEmail }],
      shallow: [{ a: mockEmail, email: mockEmail }],
      deep: [{ a: mockEmail, email: mockEmail }],
      full: [{ a: mockEmail, email: mockEmail }],
      delete: [{ a: mockEmail, email: mockEmail }],
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
    expect(result.delete).toBeUndefined();

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
      opaqueSecretKeys,
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

  it('Redacts boolean values by default when matching secret keys', async () => {
    const fieldRedactor = new FieldRedactor({ secretKeys: [/booleankey/i] });
    const result = await fieldRedactor.redact({ trueBooleanKey: true, falseBooleanKey: false });

    expect(result.trueBooleanKey).toBe('REDACTED');
    expect(result.falseBooleanKey).toBe('REDACTED');
  });
});
