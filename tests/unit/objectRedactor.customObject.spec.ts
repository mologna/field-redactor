import { CustomObject, CustomObjectMatchType } from '../../src/types';
import { ObjectRedactorTraversal } from '../../src/engine/objectRedactorTraversal';
import { PrimitiveRedactor } from '../../src/engine/primitiveRedactor';
import { SecretManager } from '../../src/rules/secretManager';
import { CustomObjectManager } from '../../src/rules/customObjectManager';
import { EMPTY_PATH_RULE_MATCHER, EMPTY_VALUE_PATTERN_MATCHER } from '../helpers/redactorTestUtils';
import {
  DEFAULT_REDACTED_TEXT,
  makeObjectRedactorFixture,
  ObjectRedactorFixture
} from '../helpers/objectRedactorSpecUtils';

describe('ObjectRedactorTraversal custom objects', () => {
  let fixture: ObjectRedactorFixture;

  beforeEach(() => {
    fixture = makeObjectRedactorFixture();
  });

describe('Custom Object Redaction', () => {
  it('Can handle CustomObjectMatchTypes correctly when value is primitive', async () => {
    const customObject: CustomObject = {
      full: CustomObjectMatchType.Opaque,
      deep: CustomObjectMatchType.Deep,
      shallow: CustomObjectMatchType.Shallow,
      pass: CustomObjectMatchType.Pass,
      ignore: CustomObjectMatchType.Ignore,
      delete: CustomObjectMatchType.Remove
    };

    fixture.customObjectManager = new CustomObjectManager([customObject]);
    const redactor: ObjectRedactorTraversal = new ObjectRedactorTraversal(fixture.primitiveRedactor, fixture.secretManager, fixture.customObjectManager, EMPTY_VALUE_PATTERN_MATCHER, EMPTY_PATH_RULE_MATCHER);
    const obj = {
      full: 'bam',
      deep: 'bam',
      shallow: 'bam',
      pass: 'bam',
      ignore: 'bam',
      delete: 'delete'
    };
    await redactor.redactInPlace(obj);
    expect(obj.full).toBe(DEFAULT_REDACTED_TEXT);
    expect(obj.deep).toBe(DEFAULT_REDACTED_TEXT);
    expect(obj.shallow).toBe(DEFAULT_REDACTED_TEXT);
    expect(obj.pass).toBe('bam');
    expect(obj.ignore).toBe('bam');
    expect(obj.delete).toBeUndefined();
  });

  it('Applies custom object rules when the input has additional keys beyond the schema', async () => {
    const metadataCustomObject: CustomObject = {
      name: CustomObjectMatchType.Ignore,
      type: CustomObjectMatchType.Ignore,
      value: 'name'
    };
    const secretKeys: RegExp[] = [/email/];
    fixture.secretManager = new SecretManager({ secretKeys });
    fixture.customObjectManager = new CustomObjectManager([metadataCustomObject]);
    const redactor: ObjectRedactorTraversal = new ObjectRedactorTraversal(fixture.primitiveRedactor, fixture.secretManager, fixture.customObjectManager, EMPTY_VALUE_PATTERN_MATCHER, EMPTY_PATH_RULE_MATCHER);

    const obj = {
      name: 'email',
      type: 'String',
      value: 'foo@bar.com',
      id: 12
    };
    await redactor.redactInPlace(obj);
    expect(obj).toEqual({
      name: 'email',
      type: 'String',
      value: DEFAULT_REDACTED_TEXT,
      id: 12
    });
  });

  it('Can handle CustomObjectMatchTypes correctly when value is an array', async () => {
    const customObject: CustomObject = {
      full: CustomObjectMatchType.Opaque,
      deep: CustomObjectMatchType.Deep,
      shallow: CustomObjectMatchType.Shallow,
      pass: CustomObjectMatchType.Pass,
      ignore: CustomObjectMatchType.Ignore,
      delete: CustomObjectMatchType.Remove
    };

    fixture.customObjectManager = new CustomObjectManager([customObject]);
    fixture.secretManager = new SecretManager({ secretKeys: [/fizz/] });
    const redactor: ObjectRedactorTraversal = new ObjectRedactorTraversal(fixture.primitiveRedactor, fixture.secretManager, fixture.customObjectManager, EMPTY_VALUE_PATTERN_MATCHER, EMPTY_PATH_RULE_MATCHER);
    const obj = {
      full: ['foo', { foo: 'bar', fizz: 'buzz' }],
      deep: ['foo', { foo: 'bar', fizz: 'buzz' }],
      shallow: ['foo', { foo: 'bar', fizz: 'buzz' }],
      pass: ['foo', { foo: 'bar', fizz: 'buzz' }],
      ignore: ['foo', { foo: 'bar', fizz: 'buzz' }],
      delete: ['foo', { foo: 'bar', fizz: 'buzz' }]
    };

    await redactor.redactInPlace(obj);
    expect(obj.full).toEqual('REDACTED');
    expect(obj.deep).toEqual(['REDACTED', { foo: 'REDACTED', fizz: 'REDACTED' }]);
    expect(obj.shallow).toEqual(['REDACTED', { foo: 'bar', fizz: 'REDACTED' }]);
    expect(obj.pass).toEqual(['foo', { foo: 'bar', fizz: 'REDACTED' }]);
    expect(obj.ignore).toEqual(['foo', { foo: 'bar', fizz: 'buzz' }]);
    expect(obj.delete).toBeUndefined();
  });

  it('Can handle CustomObjectMatchTypes correctly when value is an object', async () => {
    const customObject: CustomObject = {
      full: CustomObjectMatchType.Opaque,
      deep: CustomObjectMatchType.Deep,
      shallow: CustomObjectMatchType.Shallow,
      pass: CustomObjectMatchType.Pass,
      ignore: CustomObjectMatchType.Ignore,
      delete: CustomObjectMatchType.Remove
    };

    fixture.customObjectManager = new CustomObjectManager([customObject]);
    fixture.secretManager = new SecretManager({ secretKeys: [/fizz/, /fazz/] });
    const redactor: ObjectRedactorTraversal = new ObjectRedactorTraversal(fixture.primitiveRedactor, fixture.secretManager, fixture.customObjectManager, EMPTY_VALUE_PATTERN_MATCHER, EMPTY_PATH_RULE_MATCHER);
    const obj = {
      full: {
        bim: 'bam',
        biff: ['buzz', { bam: 'bar' }]
      },
      deep: {
        bim: 'bam',
        biff: ['buzz', { bam: 'bar' }]
      },
      shallow: {
        bim: 'bam',
        fizz: 'buzz',
        fazz: ['buzz', { bam: 'bar' }]
      },
      pass: {
        bam: 'bam',
        fizz: 'buzz'
      },
      ignore: {
        bam: 'bam',
        fizz: 'buzz'
      },
      delete: {
        bam: 'bam',
        fizz: 'buzz'
      }
    };

    await redactor.redactInPlace(obj);
    expect(obj.full).toEqual(DEFAULT_REDACTED_TEXT);
    expect(obj.deep).toEqual({
      bim: DEFAULT_REDACTED_TEXT,
      biff: [DEFAULT_REDACTED_TEXT, { bam: DEFAULT_REDACTED_TEXT }]
    });
    expect(obj.shallow).toEqual({
      bim: 'bam',
      fizz: DEFAULT_REDACTED_TEXT,
      fazz: [DEFAULT_REDACTED_TEXT, { bam: 'bar' }]
    });
    expect(obj.pass).toEqual({ bam: 'bam', fizz: DEFAULT_REDACTED_TEXT });
    expect(obj.ignore).toEqual({ bam: 'bam', fizz: 'buzz' });
    expect(obj.delete).toBeUndefined();
  });

  it('Can redact CustomObjects correctly when they are nested in another object ', async () => {
    const specialObjects = [
      {
        foo: CustomObjectMatchType.Shallow,
        bar: CustomObjectMatchType.Ignore
      }
    ];

    const input = {
      mySpecial: {
        foo: 'foo',
        bar: 'bar'
      }
    };

    fixture.customObjectManager = new CustomObjectManager(specialObjects);
    const redactor: ObjectRedactorTraversal = new ObjectRedactorTraversal(fixture.primitiveRedactor, fixture.secretManager, fixture.customObjectManager, EMPTY_VALUE_PATTERN_MATCHER, EMPTY_PATH_RULE_MATCHER);

    const result = await redactor.redactInPlace(input);
    expect(result.mySpecial.foo).toBe(DEFAULT_REDACTED_TEXT);
    expect(result.mySpecial.bar).toBe(input.mySpecial.bar);
  });

  it('Can redact CustomObjects correctly when they are nested in a deepSecret object already being redacted', async () => {
    const specialObject = {
      foo: CustomObjectMatchType.Deep,
      bar: CustomObjectMatchType.Ignore
    };
    fixture.customObjectManager = new CustomObjectManager([specialObject]);
    const deepSecretKeys: RegExp[] = [/email/];
    fixture.secretManager = new SecretManager({ deepSecretKeys });
    const redactor: ObjectRedactorTraversal = new ObjectRedactorTraversal(fixture.primitiveRedactor, fixture.secretManager, fixture.customObjectManager, EMPTY_VALUE_PATTERN_MATCHER, EMPTY_PATH_RULE_MATCHER);
    const obj = {
      email: {
        foo: 'Redact me',
        bar: 'Leave me'
      }
    };
    await redactor.redactInPlace(obj);
    expect(obj.email.foo).toBe(DEFAULT_REDACTED_TEXT);
    expect(obj.email.bar).toBe('Leave me');
  });

  it('Can redact CustomObjects correctly when they are nested in a deepSecret array already being redacted', async () => {
    const specialObject = {
      foo: CustomObjectMatchType.Deep,
      bar: CustomObjectMatchType.Ignore
    };
    fixture.customObjectManager = new CustomObjectManager([specialObject]);
    const deepSecretKeys: RegExp[] = [/email/];
    fixture.secretManager = new SecretManager({ deepSecretKeys });
    const redactor: ObjectRedactorTraversal = new ObjectRedactorTraversal(fixture.primitiveRedactor, fixture.secretManager, fixture.customObjectManager, EMPTY_VALUE_PATTERN_MATCHER, EMPTY_PATH_RULE_MATCHER);
    const obj = {
      email: [
        {
          foo: 'Redact me',
          bar: 'Leave me'
        }
      ]
    };
    await redactor.redactInPlace(obj);
    expect(obj.email[0].foo).toBe(DEFAULT_REDACTED_TEXT);
    expect(obj.email[0].bar).toBe('Leave me');
  });

  it('Can redact CustomObjects correctly when they are within arrays', async () => {
    const specialObjects = [
      {
        foo: CustomObjectMatchType.Shallow,
        bar: CustomObjectMatchType.Ignore
      }
    ];

    const input = {
      me: [
        {
          foo: 'foo',
          bar: 'bar'
        },
        {
          foo: 'foo',
          bar: 'bar'
        }
      ]
    };

    fixture.customObjectManager = new CustomObjectManager(specialObjects);
    const redactor: ObjectRedactorTraversal = new ObjectRedactorTraversal(fixture.primitiveRedactor, fixture.secretManager, fixture.customObjectManager, EMPTY_VALUE_PATTERN_MATCHER, EMPTY_PATH_RULE_MATCHER);

    const result = await redactor.redactInPlace(input);
    result.me.forEach((value: any, index: number) => {
      expect(value.foo).toBe(DEFAULT_REDACTED_TEXT);
      expect(value.bar).toBe(input.me[index].bar);
    });
  });

  it('Ignores null or undefined values in CustomObjects by default', async () => {
    const specialObject: CustomObject = {
      foo: CustomObjectMatchType.Shallow,
      bar: CustomObjectMatchType.Shallow
    };

    fixture.customObjectManager = new CustomObjectManager([specialObject]);
    fixture.secretManager = new SecretManager({ secretKeys: [] });
    const redactor: ObjectRedactorTraversal = new ObjectRedactorTraversal(fixture.primitiveRedactor, fixture.secretManager, fixture.customObjectManager, EMPTY_VALUE_PATTERN_MATCHER, EMPTY_PATH_RULE_MATCHER);
    const obj = { foo: null, bar: undefined };
    await redactor.redactInPlace(obj);
    expect(obj).toEqual({ foo: null, bar: undefined });
  });

  it('Redacts null or undefined CustomObject values if specified', async () => {
    const specialObject: CustomObject = {
      foo: CustomObjectMatchType.Shallow,
      bar: CustomObjectMatchType.Shallow
    };
    fixture.secretManager = new SecretManager({ secretKeys: [] });
    fixture.customObjectManager = new CustomObjectManager([specialObject]);
    fixture.primitiveRedactor = new PrimitiveRedactor({ ignoreNullOrUndefined: false, ignoreBooleans: false });
    const redactor: ObjectRedactorTraversal = new ObjectRedactorTraversal(fixture.primitiveRedactor, fixture.secretManager, fixture.customObjectManager, EMPTY_VALUE_PATTERN_MATCHER, EMPTY_PATH_RULE_MATCHER);

    const obj = { foo: null, bar: undefined };
    await redactor.redactInPlace(obj);
    expect(obj).toEqual({ foo: DEFAULT_REDACTED_TEXT, bar: DEFAULT_REDACTED_TEXT });
  });

  it('Redacts primitive CustomObject values using the secret manager when string key specified', async () => {
    const specialObject: CustomObject = {
      a: CustomObjectMatchType.Ignore,
      b: CustomObjectMatchType.Ignore,
      c: CustomObjectMatchType.Ignore,
      secretKey: 'a',
      deepSecretKey: 'b',
      fullSecretKey: 'c'
    };

    const secretKeys: RegExp[] = [/email/];
    const deepSecretKeys: RegExp[] = [/name/];
    const opaqueSecretKeys: RegExp[] = [/address/];
    fixture.secretManager = new SecretManager({ secretKeys, deepSecretKeys, opaqueSecretKeys });
    fixture.customObjectManager = new CustomObjectManager([specialObject]);

    const redactor: ObjectRedactorTraversal = new ObjectRedactorTraversal(fixture.primitiveRedactor, fixture.secretManager, fixture.customObjectManager, EMPTY_VALUE_PATTERN_MATCHER, EMPTY_PATH_RULE_MATCHER);
    const obj = {
      a: 'email',
      b: 'name',
      c: 'address',
      secretKey: 'foo.bar@gmail.com',
      deepSecretKey: 'John Snow',
      fullSecretKey: '123 Example Ave'
    };
    await redactor.redactInPlace(obj);
    expect(obj).toEqual({
      a: 'email',
      b: 'name',
      c: 'address',
      secretKey: DEFAULT_REDACTED_TEXT,
      deepSecretKey: DEFAULT_REDACTED_TEXT,
      fullSecretKey: DEFAULT_REDACTED_TEXT
    });
  });

  it('Redacts object CustomObject values using the secret manager when string key specified', async () => {
    const specialObject: CustomObject = {
      a: CustomObjectMatchType.Ignore,
      b: CustomObjectMatchType.Ignore,
      c: CustomObjectMatchType.Ignore,
      secretKey: 'a',
      deepSecretKey: 'b',
      fullSecretKey: 'c'
    };

    const secretKeys: RegExp[] = [/email/];
    const deepSecretKeys: RegExp[] = [/name/];
    const opaqueSecretKeys: RegExp[] = [/address/];
    fixture.secretManager = new SecretManager({ secretKeys, deepSecretKeys, opaqueSecretKeys });
    fixture.customObjectManager = new CustomObjectManager([specialObject]);
    const redactor: ObjectRedactorTraversal = new ObjectRedactorTraversal(fixture.primitiveRedactor, fixture.secretManager, fixture.customObjectManager, EMPTY_VALUE_PATTERN_MATCHER, EMPTY_PATH_RULE_MATCHER);

    const obj = {
      a: 'email',
      b: 'name',
      c: 'address',
      secretKey: {
        a: 'foo',
        name: 'should be redacted'
      },
      deepSecretKey: {
        first: 'John',
        last: 'Snow'
      },
      fullSecretKey: {
        this: 'should',
        be: 'stringified and redacted'
      }
    };
    await redactor.redactInPlace(obj);
    expect(obj).toEqual({
      a: 'email',
      b: 'name',
      c: 'address',
      secretKey: {
        a: 'foo',
        name: DEFAULT_REDACTED_TEXT
      },
      deepSecretKey: {
        first: DEFAULT_REDACTED_TEXT,
        last: DEFAULT_REDACTED_TEXT
      },
      fullSecretKey: DEFAULT_REDACTED_TEXT
    });
  });

  it('Redacts array CustomObject values using the secret manager when string key specified', async () => {
    const specialObject: CustomObject = {
      a: CustomObjectMatchType.Ignore,
      b: CustomObjectMatchType.Ignore,
      c: CustomObjectMatchType.Ignore,
      secretKey: 'a',
      deepSecretKey: 'b',
      fullSecretKey: 'c'
    };

    const secretKeys: RegExp[] = [/email/];
    const deepSecretKeys: RegExp[] = [/name/];
    const opaqueSecretKeys: RegExp[] = [/address/];
    fixture.secretManager = new SecretManager({ secretKeys, deepSecretKeys, opaqueSecretKeys });
    fixture.customObjectManager = new CustomObjectManager([specialObject]);
    const redactor: ObjectRedactorTraversal = new ObjectRedactorTraversal(fixture.primitiveRedactor, fixture.secretManager, fixture.customObjectManager, EMPTY_VALUE_PATTERN_MATCHER, EMPTY_PATH_RULE_MATCHER);

    const obj = {
      a: 'email',
      b: 'name',
      c: 'address',
      secretKey: ['foo', { email: 'should_be_redacted', fizz: 'buzz' }],
      deepSecretKey: ['foo', { email: 'should_be_redacted', fizz: 'buzz' }],
      fullSecretKey: ['foo', { email: 'should_be_redacted', fizz: 'buzz' }]
    };
    await redactor.redactInPlace(obj);
    expect(obj).toEqual({
      a: 'email',
      b: 'name',
      c: 'address',
      secretKey: [DEFAULT_REDACTED_TEXT, { email: DEFAULT_REDACTED_TEXT, fizz: 'buzz' }],
      deepSecretKey: [DEFAULT_REDACTED_TEXT, { email: DEFAULT_REDACTED_TEXT, fizz: DEFAULT_REDACTED_TEXT }],
      fullSecretKey: DEFAULT_REDACTED_TEXT
    });
  });

  it('Does not redact value if CustomObject string key specifier is not a secret', async () => {
    const specialObject: CustomObject = {
      name: CustomObjectMatchType.Ignore,
      kind: CustomObjectMatchType.Ignore,
      value: 'name'
    };
    const secretKeys: RegExp[] = [/email/];
    fixture.customObjectManager = new CustomObjectManager([specialObject]);
    fixture.secretManager = new SecretManager({ secretKeys });
    const redactor: ObjectRedactorTraversal = new ObjectRedactorTraversal(fixture.primitiveRedactor, fixture.secretManager, fixture.customObjectManager, EMPTY_VALUE_PATTERN_MATCHER, EMPTY_PATH_RULE_MATCHER);

    const obj = {
      name: 'notredacted',
      kind: 'String',
      value: 'foo.bar@gmail.com'
    };
    await redactor.redactInPlace(obj);
    expect(obj).toEqual({
      name: 'notredacted',
      kind: 'String',
      value: 'foo.bar@gmail.com'
    });
  });

  it('Does not redact value or fail if string key specifier does not exist', async () => {
    const specialObject: CustomObject = {
      name: CustomObjectMatchType.Ignore,
      kind: CustomObjectMatchType.Ignore,
      value: 'foobar'
    };

    const secretKeys: RegExp[] = [/email/];
    fixture.customObjectManager = new CustomObjectManager([specialObject]);
    fixture.secretManager = new SecretManager({ secretKeys });
    const redactor: ObjectRedactorTraversal = new ObjectRedactorTraversal(fixture.primitiveRedactor, fixture.secretManager, fixture.customObjectManager, EMPTY_VALUE_PATTERN_MATCHER, EMPTY_PATH_RULE_MATCHER);

    const obj = { name: 'email', kind: 'String', value: 'foo.bar@gmail.com' };
    await redactor.redactInPlace(obj);
    expect(obj).toEqual({
      name: 'email',
      kind: 'String',
      value: 'foo.bar@gmail.com'
    });
  });

  it('Redacts primitive CustomObject values when sibling key value is falsy but matches a secret', async () => {
    const specialObject: CustomObject = {
      name: CustomObjectMatchType.Ignore,
      kind: CustomObjectMatchType.Ignore,
      value: 'name'
    };
    const secretKeys: RegExp[] = [/^$/];
    fixture.customObjectManager = new CustomObjectManager([specialObject]);
    fixture.secretManager = new SecretManager({ secretKeys });
    const redactor: ObjectRedactorTraversal = new ObjectRedactorTraversal(fixture.primitiveRedactor, fixture.secretManager, fixture.customObjectManager, EMPTY_VALUE_PATTERN_MATCHER, EMPTY_PATH_RULE_MATCHER);

    const obj = { name: '', kind: 'String', value: 'foo.bar@gmail.com' };
    await redactor.redactInPlace(obj);
    expect(obj).toEqual({
      name: '',
      kind: 'String',
      value: DEFAULT_REDACTED_TEXT
    });
  });

  it('Redacts primitive CustomObject values when sibling key value is false and matches a secret', async () => {
    const specialObject: CustomObject = {
      name: CustomObjectMatchType.Ignore,
      kind: CustomObjectMatchType.Ignore,
      value: 'name'
    };
    const secretKeys: RegExp[] = [/^false$/];
    fixture.customObjectManager = new CustomObjectManager([specialObject]);
    fixture.secretManager = new SecretManager({ secretKeys });
    const redactor: ObjectRedactorTraversal = new ObjectRedactorTraversal(fixture.primitiveRedactor, fixture.secretManager, fixture.customObjectManager, EMPTY_VALUE_PATTERN_MATCHER, EMPTY_PATH_RULE_MATCHER);

    const obj = { name: false, kind: 'Boolean', value: true };
    await redactor.redactInPlace(obj);
    expect(obj).toEqual({
      name: false,
      kind: 'Boolean',
      value: DEFAULT_REDACTED_TEXT
    });
  });

  it('Redacts primitive CustomObject values when sibling key value is zero and matches a secret', async () => {
    const specialObject: CustomObject = {
      name: CustomObjectMatchType.Ignore,
      kind: CustomObjectMatchType.Ignore,
      value: 'name'
    };
    const secretKeys: RegExp[] = [/^0$/];
    fixture.customObjectManager = new CustomObjectManager([specialObject]);
    fixture.secretManager = new SecretManager({ secretKeys });
    const redactor: ObjectRedactorTraversal = new ObjectRedactorTraversal(fixture.primitiveRedactor, fixture.secretManager, fixture.customObjectManager, EMPTY_VALUE_PATTERN_MATCHER, EMPTY_PATH_RULE_MATCHER);

    const obj = { name: 0, kind: 'Number', value: 12345 };
    await redactor.redactInPlace(obj);
    expect(obj).toEqual({
      name: 0,
      kind: 'Number',
      value: DEFAULT_REDACTED_TEXT
    });
  });

  it('Gives CustomObjects highest precedence, followed by opaqueSecretKeys, deepSecretKeys, then secretKeys', async () => {
    const specialObject: CustomObject = {
      name: CustomObjectMatchType.Ignore,
      kind: CustomObjectMatchType.Ignore,
      value: 'name'
    };

    const secretKeys: RegExp[] = [/email/, /account/, /customObject/, /userInfo/];
    const deepSecretKeys: RegExp[] = [/account/, /customObject/, /userInfo/];
    const opaqueSecretKeys = [/account/, /customObject/];
    fixture.customObjectManager = new CustomObjectManager([specialObject]);
    fixture.secretManager = new SecretManager({ secretKeys, deepSecretKeys, opaqueSecretKeys });
    const redactor: ObjectRedactorTraversal = new ObjectRedactorTraversal(fixture.primitiveRedactor, fixture.secretManager, fixture.customObjectManager, EMPTY_VALUE_PATTERN_MATCHER, EMPTY_PATH_RULE_MATCHER);

    const obj = {
      account: {
        email: 'foobar',
        field: 'should be fully redacted'
      },
      userInfo: {
        email: 'foobar',
        field: 'should be deeply redacted'
      },
      email: 'should be redacted',
      customObject: {
        name: 'account',
        kind: 'Object',
        value: {
          name: 'email',
          kind: 'String',
          value: 'should be the only field redacted'
        }
      }
    };

    await redactor.redactInPlace(obj);
    expect(obj.account).toEqual(DEFAULT_REDACTED_TEXT);
    expect(obj.userInfo).toEqual({
      email: DEFAULT_REDACTED_TEXT,
      field: DEFAULT_REDACTED_TEXT
    });
    expect(obj.email).toBe(DEFAULT_REDACTED_TEXT);
    expect(obj.customObject).toEqual({
      name: 'account',
      kind: 'Object',
      value: {
        name: 'email',
        kind: 'String',
        value: DEFAULT_REDACTED_TEXT
      }
    });
  });
});


});
