import { JsonObject } from '../../src/types';
import { ObjectRedactorTraversal } from '../../src/engine/objectRedactorTraversal';
import { SecretManager } from '../../src/rules/secretManager';
import {
  DEFAULT_REDACTED_TEXT,
  makeObjectRedactorTraversalFixture,
  ObjectRedactorTraversalFixture,
  createTraversalFromFixture
} from '../helpers/objectRedactorTraversalSpecUtils';

describe('ObjectRedactorTraversal arrays', () => {
  let fixture: ObjectRedactorTraversalFixture;

  beforeEach(() => {
    fixture = makeObjectRedactorTraversalFixture();
  });

describe('Complex Object Redaction', () => {
  it('Can handle objects nested in arrays', async () => {
    const testArray = [
      {
        foo: 'bar',
        password: 'password'
      }
    ];

    const input = { testArray };
    const result = await fixture.basicTraversal.redactInPlace(input);
    expect(result.testArray[0].foo).toBe(DEFAULT_REDACTED_TEXT);
    expect(result.testArray[0].password).toBe(DEFAULT_REDACTED_TEXT);
  });

  it('Can handle arrays nested more than one deep in objects', async () => {
    const testObject = {
      foo: ['a', 'b', 'c']
    };

    const input = { testObject };
    const result = await fixture.basicTraversal.redactInPlace(input);
    expect(result.testObject.foo.length).toBe(3);
    result.testObject.foo.forEach((value: any) => {
      expect(value).toBe(DEFAULT_REDACTED_TEXT);
    });
  });

  it('Can handle complex nesting structures of arrays and objects', async () => {
    const testObject = {
      foo: [
        {
          bar: 'baz',
          password: 'password'
        },
        {
          bar: 'baz',
          password: 'password'
        },
        'fizz'
      ],
      bar: 'buzz'
    };

    const input = { testObject };
    const result = await fixture.basicTraversal.redactInPlace(input);
    expect(result.testObject.foo.length).toBe(testObject.foo.length);
    expect(result.testObject.foo[0] as JsonObject).toEqual(
      expect.objectContaining({
        bar: DEFAULT_REDACTED_TEXT,
        password: DEFAULT_REDACTED_TEXT
      })
    );
    expect(result.testObject.foo[1] as JsonObject).toEqual(
      expect.objectContaining({
        bar: DEFAULT_REDACTED_TEXT,
        password: DEFAULT_REDACTED_TEXT
      })
    );
    expect(result.testObject.foo[2]).toBe(DEFAULT_REDACTED_TEXT);
    expect(result.testObject.bar).toBe(DEFAULT_REDACTED_TEXT);
  });

  it('Assesses arrays even when they are not secret values to determine if they contain objects which should be assessed', async () => {
    const secretKeys = [/email/];
    fixture.secretManager = new SecretManager({ secretKeys });
    const redactor: ObjectRedactorTraversal = createTraversalFromFixture(fixture);

    const obj = {
      foo: ['bar', { email: 'foo.bar@gmail.com' }]
    };

    await redactor.redactInPlace(obj);
    expect(obj.foo[0]).toBe('bar');
    expect((obj.foo[1] as any).email).toBe(DEFAULT_REDACTED_TEXT);
  });

  it('Can perform deep redaction of nested arrays', async () => {
    const secretKeys: RegExp[] = [];
    const deepSecretKeys: RegExp[] = [/emails/];
    fixture.secretManager = new SecretManager({ secretKeys, deepSecretKeys });
    const redactor: ObjectRedactorTraversal = createTraversalFromFixture(fixture);
    const input = {
      emails: ['foo.bar@example.com', ['nested', 'array']]
    };
    await redactor.redactInPlace(input);
    expect(input.emails[0]).toBe(DEFAULT_REDACTED_TEXT);
    expect(input.emails[1][0]).toBe(DEFAULT_REDACTED_TEXT);
    expect(input.emails[1][1]).toBe(DEFAULT_REDACTED_TEXT);
  });

  it('Can delete keys when specified as removeSecretKeys in nested objects', async () => {
    const obj = {
      foo: {
        bar: {
          fizz: 'buzz'
        }
      }
    };
    const removeSecretKeys: RegExp[] = [/bar/];
    fixture.secretManager = new SecretManager({ removeSecretKeys });
    const redactor: ObjectRedactorTraversal = createTraversalFromFixture(fixture);
    await redactor.redactInPlace(obj);
    expect(obj.foo.bar).toBeUndefined();
  });

  it('Can delete keys when specified as removeSecretKeys in nested arrays and objects', async () => {
    const obj = {
      bar: ['this', 'is', 'an', 'array'],
      fizz: [
        {
          buzz: 'buzz',
          bar: 'bar'
        }
      ]
    };
    const removeSecretKeys: RegExp[] = [/bar/];
    fixture.secretManager = new SecretManager({ removeSecretKeys });
    const redactor: ObjectRedactorTraversal = createTraversalFromFixture(fixture);
    await redactor.redactInPlace(obj);
    expect(obj.bar).toBeUndefined();
    expect(obj.fizz[0].bar).toBeUndefined();
  });

  it('Can delete keys when specified as removeSecretKeys ', async () => {
    const obj = {
      foo: {
        bar: {
          fizz: 'buzz'
        }
      }
    };
    const removeSecretKeys: RegExp[] = [/bar/];
    fixture.secretManager = new SecretManager({ removeSecretKeys });
    const redactor: ObjectRedactorTraversal = createTraversalFromFixture(fixture);
    await redactor.redactInPlace(obj);
    expect(obj.foo.bar).toBeUndefined();
  });
});


});
