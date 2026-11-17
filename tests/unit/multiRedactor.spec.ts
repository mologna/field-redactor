import {
  CustomObjectMatchType,
  FieldRedactor,
  FieldRedactorConfigBuilder,
  FieldRedactorError,
  maskKeepLast,
  maskKeepLastDigits,
  validateFieldRedactorConfig
} from '../../src';
import { FieldRedactorConfigurationError } from '../../src/errors';

describe('per-field redactors', () => {
  const voltage = async (value: unknown) => `FPE:${String(value)}`;
  const voltageSync = (value: unknown) => `FPE:${String(value)}`;

  it('applies a different transform to each shallow rule and leaves the default for other keys', async () => {
    const redactor = FieldRedactorConfigBuilder.create()
      .shallow({ keys: [/ssn/i, /taxId/i], redactor: voltage })
      .shallow({ keys: [/cardNumber/i, /pan/i], syncRedactor: maskKeepLastDigits(4) })
      .shallow(/email/i)
      .buildSafeRedactor();

    const result = await redactor.redact({
      ssn: '123-45-6789',
      taxId: '99-99',
      cardNumber: '4111-1111-1111-4242',
      pan: '5500000000000004',
      email: 'alice@example.com',
      city: 'NYC'
    });

    expect(result).toEqual({
      ssn: 'FPE:123-45-6789',
      taxId: 'FPE:99-99',
      cardNumber: '****-****-****-4242',
      pan: '************0004',
      email: 'REDACTED',
      city: 'NYC'
    });
  });

  it('rejects sync redaction when a value reaches an async-only field redactor', () => {
    const redactor = new FieldRedactor({
      secretKeys: [
        { keys: [/ssn/i], redactor: voltage },
        { keys: [/pan/i], syncRedactor: maskKeepLastDigits(4) }
      ]
    });

    expect(() => redactor.redactSync({ ssn: '123-45-6789', pan: '4111111111114242' })).toThrow(
      'Sync redaction is not available without syncRedactor configuration'
    );
    expect(() => redactor.redactInPlaceSync({ ssn: '123-45-6789' })).toThrow(FieldRedactorError);
  });

  it('redactSync succeeds when no async-only field redactor is reached', () => {
    const redactor = new FieldRedactor({
      secretKeys: [{ keys: [/ssn/i], redactor: voltage }]
    });
    const inPlace = new FieldRedactor({
      secretKeys: [{ keys: [/ssn/i], redactor: voltage }],
      cloneInput: false
    });

    expect(redactor.redactSync({ city: 'NYC' })).toEqual({ city: 'NYC' });
    expect(redactor.redactInPlaceSync({ city: 'NYC' })).toBeUndefined();
    expect(inPlace.redactSync({ city: 'NYC' })).toEqual({ city: 'NYC' });
  });

  it('restores the input when in-place sync throws on a later async-only field', () => {
    const redactor = new FieldRedactor({
      secretKeys: [
        { keys: [/email/i], syncRedactor: () => 'REDACTED' },
        { keys: [/ssn/i], redactor: voltage }
      ],
      cloneInput: false
    });
    const payload = { email: 'alice@example.com', ssn: '123-45-6789' };

    expect(() => redactor.redactSync(payload)).toThrow(FieldRedactorError);
    expect(payload).toEqual({ email: 'alice@example.com', ssn: '123-45-6789' });
  });

  it('restores nested objects and arrays in place, including keys that were removed', () => {
    const redactor = new FieldRedactor({
      secretKeys: [
        { keys: [/email/i], syncRedactor: () => 'REDACTED' },
        { keys: [/ssn/i], redactor: voltage }
      ],
      removeSecretKeys: [/note/i],
      cloneInput: false
    });
    const first = { email: 'alice@example.com', note: 'keep', city: 'NYC' };
    const second = { email: 'bob@example.com', ssn: '123-45-6789' };
    const items = [first, second];
    const payload = { items };

    expect(() => redactor.redactSync(payload)).toThrow(FieldRedactorError);
    expect(payload.items).toBe(items);
    expect(items[0]).toBe(first);
    expect(items[1]).toBe(second);
    expect(first).toEqual({ email: 'alice@example.com', note: 'keep', city: 'NYC' });
    expect(second).toEqual({ email: 'bob@example.com', ssn: '123-45-6789' });
  });

  it('restores a large top-level array without emptying it when sync redaction throws', () => {
    const count = 150_000;
    const redactor = new FieldRedactor({
      secretKeys: [
        { keys: [/^0$/], syncRedactor: () => 'REDACTED' },
        { keys: [new RegExp(`^${count - 1}$`)], redactor: voltage }
      ]
    });
    const items = Array.from({ length: count }, (_, index) => String(index));

    expect(() => redactor.redactInPlaceSync(items)).toThrow(FieldRedactorError);
    expect(items).toHaveLength(count);
    expect(items[0]).toBe('0');
    expect(items[count - 1]).toBe(String(count - 1));
    expect(items[1]).toBe('1');
  });

  it('restores a schema-matched object that was written before a later async-only field throws', () => {
    const redactor = new FieldRedactor({
      secretKeys: [
        { keys: [/email/i], syncRedactor: () => 'REDACTED' },
        { keys: [/ssn/i], redactor: voltage }
      ],
      customObjects: [{ name: CustomObjectMatchType.Ignore, value: 'name' }],
      cloneInput: false
    });
    const entry = { name: 'email', value: 'alice@example.com' };
    const payload = { entry, ssn: '123-45-6789' };

    expect(() => redactor.redactSync(payload)).toThrow(FieldRedactorError);
    expect(payload.entry).toBe(entry);
    expect(entry).toEqual({ name: 'email', value: 'alice@example.com' });
    expect(payload.ssn).toBe('123-45-6789');
  });

  it('restores a schema object nested inside a schema field when a later async-only field throws', () => {
    const redactor = new FieldRedactor({
      secretKeys: [
        { keys: [/email/i], syncRedactor: () => 'REDACTED' },
        { keys: [/ssn/i], redactor: voltage }
      ],
      customObjects: [{ name: CustomObjectMatchType.Ignore, value: 'name' }],
      cloneInput: false
    });
    const inner = { name: 'email', value: 'alice@example.com' };
    const entry = { name: 'account', value: inner };
    const payload = { entry, ssn: '123-45-6789' };

    expect(() => redactor.redactSync(payload)).toThrow(FieldRedactorError);
    expect(payload.entry).toBe(entry);
    expect(entry.value).toBe(inner);
    expect(inner).toEqual({ name: 'email', value: 'alice@example.com' });
    expect(entry).toEqual({ name: 'account', value: { name: 'email', value: 'alice@example.com' } });
  });

  it('restores earlier elements of a deep array of objects, including a removed key', () => {
    const redactor = new FieldRedactor({
      secretKeys: [
        { keys: [/email/i], syncRedactor: () => 'REDACTED' },
        { keys: [/ssn/i], redactor: voltage }
      ],
      deepSecretKeys: [/^records$/],
      removeSecretKeys: [/note/i],
      cloneInput: false
    });
    const first = { email: 'alice@example.com', note: 'keep' };
    const second = { email: 'bob@example.com', ssn: '123-45-6789' };
    const records = [first, second];
    const payload = { records };

    expect(() => redactor.redactSync(payload)).toThrow(FieldRedactorError);
    expect(payload.records).toBe(records);
    expect(records[0]).toBe(first);
    expect(records[1]).toBe(second);
    expect(first).toEqual({ email: 'alice@example.com', note: 'keep' });
    expect(second).toEqual({ email: 'bob@example.com', ssn: '123-45-6789' });
  });

  it('keeps overlapping redact calls on one instance isolated', async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let entered = 0;
    const redactor = new FieldRedactor({
      secretKeys: [
        {
          keys: [/secret/i],
          redactor: async (value) => {
            entered += 1;
            if (entered === 1) {
              await gate;
            }
            return `FPE:${String(value)}`;
          }
        }
      ]
    });

    const first = redactor.redact({ secret: 'one' });
    await new Promise((resolve) => setImmediate(resolve));
    const second = redactor.redact({ secret: 'two' });
    expect(redactor.redactSync({ city: 'NYC' })).toEqual({ city: 'NYC' });
    release();

    await expect(Promise.all([first, second])).resolves.toEqual([{ secret: 'FPE:one' }, { secret: 'FPE:two' }]);
  });

  it('uses the async function from redact and the sync function from redactSync when a rule defines both', async () => {
    const redactor = FieldRedactorConfigBuilder.create()
      .shallow({
        keys: [/ssn/i],
        redactor: async (value) => `A:${String(value)}`,
        syncRedactor: (value) => `S:${String(value)}`
      })
      .buildSafeRedactor();

    await expect(redactor.redact({ ssn: '123' })).resolves.toEqual({ ssn: 'A:123' });
    expect(redactor.redactSync({ ssn: '123' })).toEqual({ ssn: 'S:123' });
  });

  it('keeps the global pair on the sync path when both global functions are set', () => {
    const redactor = new FieldRedactor({
      secretKeys: [/password/],
      redactor: async () => 'ASYNC',
      syncRedactor: () => 'SYNC'
    });

    expect(redactor.redactSync({ password: 'secret' })).toEqual({ password: 'SYNC' });
  });

  it('inherits a deep transform and lets a child key override it', () => {
    const redactor = FieldRedactorConfigBuilder.create()
      .deep({ keys: [/account/i], syncRedactor: voltageSync })
      .shallow({ keys: [/cardNumber/i], syncRedactor: maskKeepLastDigits(4) })
      .buildSafeRedactor();

    expect(
      redactor.redactSync({
        account: { name: 'alice', city: 'NYC', cardNumber: '4111-1111-1111-4242' }
      })
    ).toEqual({
      account: { name: 'FPE:alice', city: 'FPE:NYC', cardNumber: '****-****-****-4242' }
    });
  });

  it('inherits a deep transform through a schema sibling that is not a path segment', () => {
    const redactor = FieldRedactorConfigBuilder.create()
      .deep({ keys: [/account/i], syncRedactor: voltageSync })
      .shallow({ keys: [/cardNumber/i], syncRedactor: maskKeepLastDigits(4) })
      .schema({ name: CustomObjectMatchType.Ignore, value: 'name' }, { name: 'metadata-entry' })
      .buildSafeRedactor();

    expect(
      redactor.redactSync({
        metadata: [{ name: 'account', value: { holder: 'alice', cardNumber: '4111111111114242' } }]
      })
    ).toEqual({
      metadata: [{ name: 'account', value: { holder: 'FPE:alice', cardNumber: '************4242' } }]
    });
  });

  it('selects the schema sibling specifier instead of the leaf key', () => {
    const seen: string[] = [];
    const redactor = FieldRedactorConfigBuilder.create()
      .shallow({
        keys: [/cardNumber/i],
        syncRedactor: (value, context) => {
          seen.push(`${context?.key}@${context?.path}`);
          return maskKeepLastDigits(4)(value);
        }
      })
      .schema({ name: CustomObjectMatchType.Ignore, value: 'name' })
      .buildSafeRedactor();

    expect(
      redactor.redactSync({
        metadata: [{ name: 'cardNumber', value: '4111-1111-1111-4242' }]
      })
    ).toEqual({
      metadata: [{ name: 'cardNumber', value: '****-****-****-4242' }]
    });
    expect(seen).toEqual(['cardNumber@metadata[0].value']);
  });

  it('lets a path rule transform override the key-rule transform', () => {
    const redactor = FieldRedactorConfigBuilder.create()
      .shallow({ keys: [/number/i], syncRedactor: (value) => `KEY:${String(value)}` })
      .pathRule({
        path: 'billing.card.number',
        mode: 'shallow',
        syncRedactor: maskKeepLastDigits(4)
      })
      .buildSafeRedactor();

    expect(
      redactor.redactSync({
        billing: { card: { number: '4111-1111-1111-4242' } },
        number: '5555444433331111'
      })
    ).toEqual({
      billing: { card: { number: '****-****-****-4242' } },
      number: 'KEY:5555444433331111'
    });
  });

  it('falls through to the key-rule transform when the matching path rule has none', () => {
    const redactor = FieldRedactorConfigBuilder.create()
      .shallow({ keys: [/ssn/i], syncRedactor: voltageSync })
      .pathRule('person.ssn', 'shallow')
      .buildSafeRedactor();

    expect(redactor.redactSync({ person: { ssn: '123-45-6789' } })).toEqual({
      person: { ssn: 'FPE:123-45-6789' }
    });
  });

  it('passes key and path into the redactor', () => {
    const redactor = FieldRedactorConfigBuilder.create()
      .shallow({
        keys: [/ssn/i],
        syncRedactor: (_value, context) => `${context?.key}:${context?.path}`
      })
      .buildSafeRedactor();

    expect(redactor.redactSync({ user: { ssn: '123' } })).toEqual({
      user: { ssn: 'ssn:user.ssn' }
    });
  });

  it('does not use a lower-precedence key transform when a higher mode matched without one', () => {
    const redactor = new FieldRedactor({
      opaqueSecretKeys: [/payload/i],
      secretKeys: [{ keys: [/payload/i], syncRedactor: voltageSync }]
    });

    expect(redactor.redactSync({ payload: { a: 1 } })).toEqual({ payload: 'REDACTED' });
  });

  it('stores object rules from the builder and still accepts bare regexes', () => {
    const syncRedactor = () => 'X';
    const keepLast = maskKeepLast(4);
    const config = FieldRedactorConfigBuilder.create()
      .shallow(/email/i, /password/i)
      .shallow({ keys: [/ssn/i], syncRedactor })
      .deep({ keys: [/account/i], redactor: voltage })
      .pathRule({ path: 'billing.card.number', mode: 'shallow', syncRedactor: keepLast })
      .build();

    expect(config.secretKeys).toEqual([/email/i, /password/i, { keys: [/ssn/i], syncRedactor }]);
    expect(config.deepSecretKeys).toEqual([{ keys: [/account/i], redactor: voltage }]);
    expect(config.pathRules).toEqual([{ path: 'billing.card.number', mode: 'shallow', syncRedactor: keepLast }]);
  });
});

describe('maskKeepLast', () => {
  const mask = maskKeepLast(4);

  it('keeps the last characters and masks a short value entirely', () => {
    expect(mask('12345')).toBe('*2345');
    expect(mask('1234')).toBe('****');
    expect(mask('12')).toBe('**');
    expect(mask('')).toBe('');
    expect(maskKeepLast(0)('secret123')).toBe('*********');
  });

  it('rejects an invalid length or mask character', () => {
    expect(() => maskKeepLast(-1)).toThrow(FieldRedactorConfigurationError);
    expect(() => maskKeepLast(1.5)).toThrow(FieldRedactorConfigurationError);
    expect(() => maskKeepLast(4, '**')).toThrow(FieldRedactorConfigurationError);
  });
});

describe('maskKeepLastDigits', () => {
  const mask = maskKeepLastDigits(4);

  it('masks digits, preserves separators, and masks every digit when fewer than count remain', () => {
    expect(mask('4111-1111-1111-4242')).toBe('****-****-****-4242');
    expect(mask('4111111111114242')).toBe('************4242');
    expect(mask('1234')).toBe('****');
    expect(mask('12-3')).toBe('**-*');
    expect(maskKeepLastDigits(0)('4111-11')).toBe('****-**');
  });
});

describe('key redactor rule validation', () => {
  it('warns when the same pattern is bound to two transforms', () => {
    const warnings = validateFieldRedactorConfig({
      secretKeys: [
        { keys: [/ssn/i], syncRedactor: () => 'a' },
        { keys: [/ssn/i], syncRedactor: () => 'b' }
      ]
    });

    expect(warnings.some((warning) => warning.includes('more than one redactor'))).toBe(true);
  });

  it('throws when a rule object has no keys', () => {
    expect(() =>
      validateFieldRedactorConfig({
        secretKeys: [{ keys: [], syncRedactor: () => 'a' }]
      })
    ).toThrow(FieldRedactorConfigurationError);
  });

  it('warns on a global flag inside a rule object', () => {
    const warnings = validateFieldRedactorConfig({
      secretKeys: [{ keys: [/ssn/g], syncRedactor: () => 'a' }]
    });

    expect(warnings.some((warning) => warning.includes('Global regex') && warning.includes('secretKeys'))).toBe(true);
  });
});
