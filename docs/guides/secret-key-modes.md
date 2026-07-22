# Secret key modes

FieldRedactor applies **Shallow**, **Deep**, **Opaque**, and **Remove** rules via regex key matching. Throughout the docs, these are the conceptual names; the config fields are `secretKeys`, `deepSecretKeys`, `opaqueSecretKeys`, and `removeSecretKeys` (legacy aliases `fullSecretKeys` / `deleteSecretKeys` still work).

**Precedence** (highest wins): Schema (`customObjects`) → Opaque → Deep → Remove → Shallow → Value-pattern (`valuePatterns`)

## Cheat sheet

Same input for every row:

```json
{
  "username": "alice",
  "contactInfo": { "email": "alice@example.com", "city": "NYC" },
  "authKey": "secret-token"
}
```

| Mode | Config field | Example | Result |
| --- | --- | --- | --- |
| **Shallow** | `secretKeys` | `[/email/]` | `contactInfo.email` → `"REDACTED"`; `city`, `username` unchanged |
| **Deep** | `deepSecretKeys` | `[/contactInfo/]` | All primitives inside `contactInfo` redacted |
| **Opaque** | `opaqueSecretKeys` | `[/contactInfo/]` | Entire `contactInfo` replaced with `"REDACTED"` |
| **Remove** | `removeSecretKeys` | `[/authKey/]` | `authKey` key removed from output |

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

Nested objects keep normal traversal rules; primitives inside arrays at matching keys are redacted.

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
