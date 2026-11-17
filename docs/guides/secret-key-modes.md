# Secret key modes

FieldRedactor applies **Shallow**, **Deep**, **Opaque**, and **Remove** rules via regex key matching. Throughout the docs, these are the conceptual names; the config fields are `secretKeys`, `deepSecretKeys`, `opaqueSecretKeys`, and `removeSecretKeys`.

**Precedence** (highest wins): Schema (`customObjects`) → path rule (`pathRules`) → Opaque → Deep → Remove → Shallow → Value-pattern (`valuePatterns`) → default

## Cheat sheet

Same input for every row:

```json
{
  "username": "alice",
  "contactInfo": { "email": "alice@example.com", "city": "NYC" },
  "authKey": "secret-token"
}
```

| Mode        | Config field       | Example           | Result                                                           |
| ----------- | ------------------ | ----------------- | ---------------------------------------------------------------- |
| **Shallow** | `secretKeys`       | `[/email/]`       | `contactInfo.email` → `"REDACTED"`; `city`, `username` unchanged |
| **Deep**    | `deepSecretKeys`   | `[/contactInfo/]` | All primitives inside `contactInfo` redacted                     |
| **Opaque**  | `opaqueSecretKeys` | `[/contactInfo/]` | Entire `contactInfo` replaced with `"REDACTED"`                  |
| **Remove**  | `removeSecretKeys` | `[/authKey/]`     | `authKey` key removed from output                                |

### Builder API

```typescript
import { FieldRedactorConfigBuilder } from 'field-redactor';

const config = FieldRedactorConfigBuilder.create()
  .shallow(/email/i)
  .deep(/contactInfo/i)
  .opaque(/rawPayload/i)
  .remove(/authKey/i)
  .build();
```

## Shallow (`secretKeys`)

Redact matching keys' scalar values without deep-walking child objects. If **no** redaction rules of any type are configured, every value is treated as Shallow (all fields redacted).

```typescript
import { FieldRedactor } from 'field-redactor';

const fieldRedactor = new FieldRedactor({
  secretKeys: [/email/i, /name/i, /userid/i]
});

await fieldRedactor.redact({
  userId: 271,
  contactInfo: { email: 'foo@bar.com', firstName: 'Foo', Salutation: 'Mr.' }
});
// → userId, email, firstName redacted; Salutation unchanged
```

Nested objects keep normal traversal rules; primitives inside arrays at matching keys are redacted. Numeric scalars (for example `{ "mdn": 1234567890 }`) are coerced to strings before your custom `redactor` / `syncRedactor` runs, so string-only redactors still mask them.

## Deep (`deepSecretKeys`)

Redact matching keys and **all** descendant primitives. Higher precedence than Shallow.

```typescript
const fieldRedactor = new FieldRedactor({
  deepSecretKeys: [/contactInfo/i]
});

await fieldRedactor.redact({
  contactInfo: {
    email: 'foo@bar.com',
    lastUpdatedBy: { id: 1 }
  }
});
// → email, id, and other primitives under contactInfo are redacted
```

## Opaque (`opaqueSecretKeys`)

Stringify the entire value at matching keys, then redact. Typical for objects and arrays you want to hide completely.

```typescript
const fieldRedactor = new FieldRedactor({
  opaqueSecretKeys: [/contactInfo/i]
});

await fieldRedactor.redact({
  contactInfo: { email: 'foo@bar.com', firstName: 'Foo' }
});
// → { contactInfo: "REDACTED" }
```

## Remove (`removeSecretKeys`)

Delete matching keys from the output.

```typescript
const fieldRedactor = new FieldRedactor({
  removeSecretKeys: [/authKey/i]
});

await fieldRedactor.redact({ authKey: 'secret-token', username: 'alice' });
// → { username: 'alice' }
```

## Per-field redactors

Bare regexes use the default redactor (`"REDACTED"`, or the `redactor` / `syncRedactor` set on the instance). A rule object attaches one transform to every key in `keys`. The same object form works on `shallow`, `deep`, `opaque`, and `pathRule`. `remove` stays regex-only.

```typescript
import { FieldRedactorConfigBuilder, maskKeepLastDigits } from 'field-redactor';

const voltageFpe = async (value: unknown) => voltage.encrypt(String(value));

const redactor = FieldRedactorConfigBuilder.create()
  .shallow({ keys: [/ssn/i, /taxId/i], redactor: voltageFpe })
  .shallow({ keys: [/cardNumber/i, /pan/i], syncRedactor: maskKeepLastDigits(4) })
  .shallow(/email/i)
  .deep({ keys: [/account/i], redactor: voltageFpe })
  .pathRule({ path: 'billing.card.number', mode: 'shallow', syncRedactor: maskKeepLastDigits(4) })
  .buildSafeRedactor();
```

`maskKeepLast(count)` masks every character except the last `count`, and masks the whole value when it is shorter than or equal to `count`. A count of 0 masks the whole value. `maskKeepLastDigits(count)` does that for digits only and leaves separators in place (`4111-1111-1111-4242` → `****-****-****-4242`). `count` or fewer digits, including a count of 0, masks every digit.

When a value is redacted, the transform is chosen in this order:

1. The matching path rule's transform, when it has one.
2. The first matching key pattern's transform. Mode precedence still applies, and the first registered pattern in that list wins.
3. The transform inherited from the nearest opaque or deep ancestor that had one. A deep `account` bound to Voltage encrypts descendant primitives. A child `cardNumber` bound to last-four overrides that ancestor. Shallow transforms are not inherited.
4. The global `redactor` / `syncRedactor`, or `"REDACTED"`.

Schema fields look up the sibling specifier (`cardNumber`), not the leaf key (`value`). Pass keys and `remove` do not call a transform.

Redactors may take a second argument, `{ key, path }`. FieldRedactor always passes it. `key` is the field name, or the schema sibling value. `path` is the JSON path (`account.cardNumber`, `metadata[0].value`). Existing one-argument functions still work.

`redact()` uses a rule's `redactor` when it has one. `redactSync()` uses that rule's `syncRedactor`. A rule that sets `redactor` without `syncRedactor` makes `redactSync()` and `redactInPlaceSync()` throw when a matching value reaches that rule. Documents with no matching values still redact synchronously. If that throw happens during an in-place sync walk, each write is undone on the object that was changed, so a nested object or array a caller already holds is restored in place and keeps its identity. The walk records those writes as it goes and does not clone the input first. The global pair is unchanged: when both global functions are set, both paths use `syncRedactor`.
