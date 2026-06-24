# FieldRedactor

A utility `npm` module for redacting sensitive data from JSON objects using complex, recursive evaluation logic.

It can redact JSON values based on Regular Expression key matching, **Schema** rules for shaped objects (PII identified by sibling fields rather than key names), **Deep** subtree redaction, **Opaque** whole-value redaction, and other strategies that simpler tools cannot handle.

# History
In many instances, redaction of sensitive data from log output is fairly straightforward and can be accomplished through existing redaction libraries. However, I often encountered scenarios where such simplistic approaches were not sufficient. Take, for example, the following object:

```json
{
  "name": "email",
  "type": "String",
  "value": "foo.bar@example.com"
}
```

If this object is placed in a data set with many others, and only some of these objects contain PII, redaction becomes quite troublesome. One could redact all `value` fields from these objects - but this merely renders the log output useless for debugging or tracing, as all values are now redacted. The value of the `name` field determines whether or not the `value` field should be redacted. In practice these objects often carry additional fields as well (such as `id` or `type`) that should not prevent schema matching. I often found myself writing custom logic to make this determination, which led to brittle code that was difficult to maintain. In the end I decided to write a new, highly configurable plug-and-play solution that could redact sensitive data in various manners while requiring only minor configuration tweaks. Enter FieldRedactor!

## Basic Usage
Basic usage of the FieldRedactor is straightforward but not recommended. Object redaction can be performed either in-place or return the redacted object. If redactor is given a string, primitive, Date, function, or null/undefined value then it returns the value without modification.

```typescript
import { FieldRedactor } from 'field-redactor';
const myJsonObject = { foo: "bar", fizz: null };
const fieldRedactor = new FieldRedactor();

// return redacted result
const result = await fieldRedactor.redact(myJsonObject);
const primitiveResult = await fieldRedactor.redact("foobar");
console.log(myJsonObject); // { foo: "bar", fizz: null }
console.log(result); // { foo: "REDACTED", fizz: null }
console.log(primitiveResult); // "foobar"

// redact in place
await fieldRedactor.redactInPlace(myJsonObject);
console.log(myJsonObject); // { foo: "REDACTED", fizz: null }
```

> **Note:** `null`, `undefined`, `string`, `Date`, `Function`, and primitive value inputs are completely ignored.
> 
> **Note:** `redact()` / `redactSync()` use copy-on-write by default (`cloneInput: true`), so only branches that change are cloned and unmodified subtrees are shared with the input. Set `cloneInput: false` to mutate the input in place instead.
>
> **Tip:** Prefer `FieldRedactor.createSafe({ secretKeys: [...] })` for new projects — it requires explicit Shallow / Deep / Opaque / Remove / Schema rules and avoids the default where omitting all rules redacts every value. See [Safe construction](#safe-construction) below.

## Start here

Not sure which config options you need? Use this decision guide:

```
Do you know which JSON keys are always sensitive (email, password, authKey, …)?
  ├─ yes → pick a redaction mode (see [cheat sheet](#redaction-modes-cheat-sheet)):
  │         Shallow (`secretKeys`), Deep (`deepSecretKeys`), Opaque (`fullSecretKeys`), or Remove (`deleteSecretKeys`)
  └─ no / only sometimes → do values live in shaped objects (e.g. { name, value })?
        ├─ yes → define an object schema via `customObjects`
        └─ no  → Shallow (`secretKeys`) on stable field names
```

**Precedence** (highest wins): Schema (`customObjects`) → Opaque (`fullSecretKeys`) → Deep (`deepSecretKeys`) → Remove (`deleteSecretKeys`) → Shallow (`secretKeys`)

Throughout this README, **Shallow / Deep / Opaque / Remove / Schema** are the conceptual names; the **config field** in backticks is what you type in code.

### Terminology

| Concept (docs) | Config field / type | What it does |
| --- | --- | --- |
| **Shallow** | `secretKeys` | Redact this field's scalar value only; recurse into nested objects with normal rules |
| **Deep** | `deepSecretKeys` | Redact this field and all descendant primitives |
| **Opaque** | `fullSecretKeys` | Stringify the entire value (object or array), then redact |
| **Remove** | `deleteSecretKeys` | Delete the key from the output |
| **Schema** | `customObjects` / `CustomObject` | Match a specific object shape and apply per-field rules (including sibling-key indirection) |

### Most common setup

This pattern covers typical application logs: named fields are redacted, auth keys are removed, and `{ name, value }` metadata entries are redacted based on the `name` sibling:

```typescript
import { CustomObjectMatchType, FieldRedactor } from 'field-redactor';

const fieldRedactor = FieldRedactor.createSafe({
  secretKeys: [/email/i, /password/i, /phone/i, /.+name$/i], // Shallow
  deleteSecretKeys: [/authKey/i], // Remove
  customObjects: [
    {
      name: CustomObjectMatchType.Ignore,
      value: 'name' // Schema: redact value when sibling name matches Shallow rules
    }
  ]
});

// { name: "email", value: "alice@example.com" } → value redacted
// { name: "traceId", value: "abc-123" } → value unchanged
```

### Redaction modes cheat sheet

Same input for every row — only the configured mode changes:

```json
{
  "username": "alice",
  "contactInfo": { "email": "alice@example.com", "city": "NYC" },
  "authKey": "secret-token"
}
```

| Doc label | Config option | Config example | Result |
| --- | --- | --- | --- |
| **Shallow** | `secretKeys` | `[/email/]` | `contactInfo.email` → `"REDACTED"`; `city`, `username` unchanged |
| **Deep** | `deepSecretKeys` | `[/contactInfo/]` | All primitives inside `contactInfo` redacted (`email`, `city`) |
| **Opaque** | `fullSecretKeys` | `[/contactInfo/]` | Entire `contactInfo` replaced with `"REDACTED"` |
| **Remove** | `deleteSecretKeys` | `[/authKey/]` | `authKey` key removed from output |
| **Schema** | `customObjects` | sibling `value: 'name'` | `{ name: "email", value: "…" }` → only `value` redacted when `name` matches Shallow rules |

See [Terminology](#terminology) for the full concept ↔ config field map.

### Safe construction

```typescript
import { FieldRedactor, FieldRedactorConfigurationError } from 'field-redactor';

// Requires at least one non-empty rule array or customObjects entry
const redactor = FieldRedactor.createSafe({ secretKeys: [/email/, /password/] });

try {
  FieldRedactor.createSafe({}); // throws FieldRedactorConfigurationError
} catch (error) {
  if (error instanceof FieldRedactorConfigurationError) {
    // misconfiguration caught at construction time
  }
}
```

`new FieldRedactor()` with no Shallow / Deep / Opaque / Remove / Schema rules still redacts **all** values (backward compatible). Use `createSafe()` when you want guardrails.

### Errors

Both error types are exported from the package entry point:

| Class | When thrown |
| --- | --- |
| `FieldRedactorError` | Redaction fails at runtime (e.g. custom `redactor` throws) |
| `FieldRedactorConfigurationError` | Invalid configuration (duplicate schemas, `createSafe()` with no rules) |

```typescript
import { FieldRedactor, FieldRedactorConfigurationError, FieldRedactorError } from 'field-redactor';
```


## Customization
The true power of this tool comes from its customization. Combine **Shallow**, **Deep**, **Opaque**, and **Remove** key rules with **Schema**-based object rules for shaped payloads (for example `{ name, value }` metadata). The redactor function itself is also configurable.

### Overview
| Doc label | Config field | Type | Default | Effect |
|-----------|--------------|------|---------|--------|
| — | `redactor` | `(val: any) => Promise<string>` | `(val) => Promise.resolve("REDACTED")` | Async function applied when a value is redacted. When only `redactor` is set, traversal stays async. |
| — | `syncRedactor` | `(val: any) => string` | `() => "REDACTED"` (when no `redactor`) | Synchronous redactor. Avoids per-field Promise overhead when used with `redactSync()`. |
| **Shallow** | `secretKeys` | `RegExp[]` | `null` | Redact matching keys' scalar values. Nested objects keep normal rules; array primitives are redacted. If omitted with no other rules, all values are treated as Shallow matches. |
| **Deep** | `deepSecretKeys` | `RegExp[]` | `[]` | Deeply redact all primitives under matching keys unless a Schema or Opaque rule applies. |
| **Opaque** | `fullSecretKeys` | `RegExp[]` | `[]` | Stringify and redact the entire value at matching keys (typical for objects and arrays). |
| **Remove** | `deleteSecretKeys` | `RegExp[]` | `[]` | Delete matching keys from the output. |
| **Schema** | `customObjects` | `CustomObject[]` | `[]` | Per-shape rules, including sibling-key indirection. See [Object schemas](#object-schemas-customobjects--customobject). |
| — | `ignoreBooleans` | `boolean` | `false` | When `true`, booleans are not redacted even when their key matches a rule. |
| — | `ignoreNullOrUndefined` | `boolean` | `true` | When `true`, `null` and `undefined` are not redacted. |
| — | `cloneInput` | `boolean` | `true` | When `true`, `redact()` / `redactSync()` leave the input untouched via copy-on-write. Set `false` to mutate in place. |

### `redactor` Configuration
Configures the redactor function used when a secret is encountered. Users should typically provide this configuration.

When you only need synchronous redaction (for example hashing or returning a static token), prefer `syncRedactor` or the default redactor and call `redactSync()` / `redactInPlaceSync()` to avoid per-field Promise allocation. If you configure only an async `redactor`, `redact()` and `redactInPlace()` remain fully async. You can provide both: `syncRedactor` drives the sync path while `redactor` is used when async traversal is required.

#### Details
- **Type:** `(val: any) => Promise<string>`
- **Effect:** The function used to redact values asynchronously.
  - Value can only be null or undefined if `ignoreNullOrUndefined` is set to false.
  - When no custom async `redactor` is configured, `redact()` resolves without per-field Promises.

### `syncRedactor` Configuration
Optional synchronous counterpart to `redactor`. When `syncRedactor` is set, or when no custom `redactor` is provided, the library uses a synchronous traversal path.

#### Details
- **Type:** `(val: any) => string`
- **Effect:** Redacts values without awaiting. Enables `redactSync()` and `redactInPlaceSync()` on `FieldRedactor`.

#### Example
```typescript
import { FieldRedactor } from 'field-redactor';

const fieldRedactor = new FieldRedactor({
  secretKeys: [/password/],
  syncRedactor: (val) => `REDACTED:${val}`
});

const result = fieldRedactor.redactSync({ username: 'alice', password: 'secret' });
// { username: 'alice', password: 'REDACTED:secret' }
```

### Sync API
| Method | Returns | Notes |
|--------|---------|-------|
| `redactSync(value)` | Deep-cloned redacted value | Copy-on-write by default; only mutated branches are cloned |
| `redactInPlaceSync(value)` | `void` | Mutates traversable input in place synchronously |

`redact()` and `redactInPlace()` automatically use the sync path when no async-only `redactor` is configured, so existing `await fieldRedactor.redact(...)` call sites benefit without code changes. With the default `cloneInput: true`, `redact()` / `redactSync()` share unmodified subtrees with the input instead of deep-cloning the full object up front. Set `cloneInput: false` when the input is disposable or you want in-place mutation without copying.

#### Example
##### Code
```typescript
import { FieldRedactor } from 'field-redactor';
import * as crypto from 'crypto';
const redactor: Redactor = (val: any) => Promise.resolve(crypto.createHash('sha256').update(val.toString()).digest('hex'));
const fieldRedactor = new FieldRedactor({
  redactor
});
const result = await redactor.redact({foo: "bar"});
console.log(result);
```

##### Output
```bash
'fcde2b2edba56bf408601fb721fe9b5c338d10ee429ea04fae5511b68fbf8fb9'
```

### Shallow redaction (`secretKeys`)
* **Shallow** mode — redact matching keys' scalar values without deep-walking child objects.
* If no redaction rules of any type are specified, **every value is treated as Shallow** (all fields redacted).
* Lowest precedence among key-based modes (see [Terminology](#terminology)).

#### Details
- **Config field:** `secretKeys`
- **Type:** `RegExp[]`
- **Default:** All values considered Shallow matches unless another rule type is specified.
- **Effect:** Matches keys in objects, child objects, or array primitives. Assessed recursively; nested objects are not deep-redacted.

#### Example
##### Code
```typescript
import { FieldRedactor } from 'field-redactor';
const myJsonObject = {
  timestamp: "2024-12-01T22:07:26.448Z",
  userId: 271,
  contactInfo: {
    email: "foo.bar@example.com",
    firstName: "Foo",
    lastName: "Bar",
    Salutation: "Mr.",
  },
  someSecretData: ["fizz", "buzz", { deep: "is not redacted", name: "foobar" }],
}
const fieldRedactor = new FieldRedactor({
  secretKeys: [/email/i, /name/i, /userid/i, /someSecretData/i],
});
const result = await fieldRedactor.redact(myJsonObject);
console.log(result);
```

##### Output
```json
{
  "timestamp": "2024-12-01T22:07:26.448Z",
  "userId": "REDACTED",
  "contactInfo": {
    "email": "REDACTED",
    "firstName": "REDACTED",
    "lastName": "REDACTED",
    "Salutation": "Mr.",
  },
  "someSecretData": ["REDACTED", "REDACTED", { "deep": "is not redacted", "name": "REDACTED" }]
}
```

> - `email` and `name` fields were all redacted
> - primitives in `someSecretData` array were redacted
> - object values in `someSecretData` was evaluated and redacted if applicable

### Deep redaction (`deepSecretKeys`)
* **Deep** mode — redact matching keys and all descendant primitives.
* Higher precedence than **Shallow** (`secretKeys`).
* Children are fully redacted unless **Opaque** (`fullSecretKeys`) or **Schema** (`customObjects`) rules apply.

#### Details
- **Config field:** `deepSecretKeys`
- **Type:** `RegExp[]`
- **Default:** `[]`
- **Effect:** Matches keys in objects or child objects and deeply redacts all values, including nested objects and objects within arrays.
  - _Note: has higher precedence than Shallow (`secretKeys`)._

#### Example
##### Code
```typescript
import { FieldRedactor } from 'field-redactor';
const myJsonObject = {
  timestamp: "2024-12-01T22:07:26.448Z",
  userId: 271,
  contactInfo: {
    email: "foo.bar@example.com",
    firstName: "Foo",
    lastName: "Bar",
    Salutation: "Mr.",
    lastUpdatedBy: {
      id: 1
    }
  },
  someSecretData: ["fizz", "buzz", { deep: "FOO", name: "BAR" }]
}
const fieldRedactor = new FieldRedactor({
  deepSecretKeys: [/someSecretData/i, /contactInfo/i]
});
const result = await fieldRedactor.redact(myJsonObject);
console.log(result);
```

##### Output
```json
{
  "timestamp": "2024-12-01T22:07:26.448Z",
  "userId": 271,
  "contactInfo": {
    "email": "REDACTED",
    "firstName": "REDACTED",
    "lastName": "REDACTED",
    "Salutation": "REDACTED",
    "lastUpdatedBy": {
      "id": "REDACTED"
    }
  },
  "someSecretData": ["REDACTED", "REDACTED", { "deep": "REDACTED", "name": "REDACTED" }]
}
```
> - All values in `contactInfo` were redacted
> - All values in `someSecretData` were redacted

### Opaque redaction (`fullSecretKeys`)
* **Opaque** mode — stringify the entire value at matching keys, then redact.
* Higher precedence than **Shallow** and **Deep**; lower than **Schema** (`customObjects`).

#### Details
- **Config field:** `fullSecretKeys`
- **Type:** `RegExp[]`
- **Default:** `[]`
- **Effect:** Matches keys and stringifies + redacts their values. Primarily used for objects and arrays.

#### Example
##### Code
```typescript
import { FieldRedactor } from 'field-redactor';

const myJsonObject = {
  timestamp: "2024-12-01T22:07:26.448Z",
  userId: 271,
  contactInfo: {
    email: "foo.bar@example.com",
    firstName: "Foo",
    lastName: "Bar",
    Salutation: "Mr.",
    preference: "email",
    lastUpdated: "2024-12-01T22:07:26.448Z"
  }
}
const fieldRedactor = new FieldRedactor({
  fullSecretKeys: [/someSecretData/i],
});
const result = await fieldRedactor.redact(myJsonObject);
console.log(result);
```

##### Output
```json
{
  "timestamp": "2024-12-01T22:07:26.448Z",
  "userId": 271,
  "contactInfo": "REDACTED"
}
```
> - Entirity of `contactInfo` was redacted.

### Remove (`deleteSecretKeys`)
* **Remove** mode — delete matching keys from the output entirely.

#### Details
- **Config field:** `deleteSecretKeys`
- **Type:** `RegExp[]`
- **Default:** `[]`
- **Effect:** Matches keys and deletes them from output.
  - Has lower precedence than **Schema** (`customObjects`).

#### Example
##### Code
```typescript
import { FieldRedactor } from 'field-redactor';

const myJsonObject = {
  timestamp: "2024-12-01T22:07:26.448Z",
  userId: 271,
  appAuthKey: "12345-67890"
}
const fieldRedactor = new FieldRedactor({
  deleteSecretKeys: [/authKey/i],
});
const result = await fieldRedactor.redact(myJsonObject);
console.log(result);
```

##### Output
```json
{
  "timestamp": "2024-12-01T22:07:26.448Z",
  "userId": 271
}
```
> - `appAuthKey` was deleted

### Object schemas (`customObjects` / `CustomObject`)
* **Schema** mode — the most powerful feature of this library and why it was written.
* Combine schemas with Shallow / Deep / Opaque / Remove rules for conditional redaction of shaped objects (for example `{ name, type, value }` metadata).

#### Details
- **Config field:** `customObjects`
- **Type:** `CustomObject` (see [Schema definition](#customobject-schema) below)
- **Default:** `[]`
- **Effect:** Any object matching a schema is redacted according to that schema's per-field rules.
  - _Note: highest precedence among all modes_
  - _Note: when schemas nest, the child schema wins_

#### Schema matching
An input object matches a `CustomObject` schema when it contains **every key defined in the schema**. Additional keys on the input are allowed and are not evaluated by the schema rules.

When multiple schemas match the same input object, the schema with the **most keys** is selected.

This relaxed matching is useful for real-world payloads such as metadata entries that include optional or contextual fields (for example, an `id` or `timestamp`) alongside the fields your schema cares about.

```typescript
// This schema matches objects that contain name, type, and value — even when extra fields are present.
const metadataCustomObject: CustomObject = {
  name: CustomObjectMatchType.Ignore,
  type: CustomObjectMatchType.Ignore,
  value: 'name'
};

// Matches: { name: "email", type: "String", value: "foo@bar.com", id: 12 }
// Does not match: { name: "email", value: "foo@bar.com" } // missing required "type" key
```

#### `CustomObject` schema
```typescript
{
  [key]: CustomObjectMatchType | string
}
```

- `key`
  - **Type:** `string`
  - **Effect:** Required field for schema matching.
- `value`:
  - **Type:** `CustomObjectMatchType | string`
  - **Effect:** How this field is redacted when the schema matches
    - `string` — names a **sibling key** on the same object. If that sibling is present, its value is tested against Shallow / Deep / Opaque / Remove rules (`secretKeys`, `deepSecretKeys`, `fullSecretKeys`, `deleteSecretKeys`). Sibling key presence uses `hasOwnProperty`; falsy values such as `""`, `0`, and `false` are supported.
    - `CustomObjectMatchType` — apply the match type directly (mirrors the top-level modes where applicable).


#### `CustomObjectMatchType` enum
Per-field modes inside a schema when not using a sibling-key string specifier:

| Enum value | Doc label | Description |
| --- | --- | --- |
| `Delete` | Remove | Delete the field from the result. |
| `Full` | Opaque | Stringify value and redact. |
| `Deep` | Deep | Redact if primitive; deeply redact if object or array. |
| `Shallow` | Shallow | Redact if primitive or array of primitives; otherwise revert to normal traversal rules. |
| `Pass` | — | Do not redact; revert to normal rules for child objects or objects in arrays. |
| `Ignore` | — | Skip evaluation entirely. |

#### Sibling key specifier example
The sibling key's **value** (not its truthiness) determines whether Shallow / Deep / Opaque / Remove rules apply. This is the pattern used for metadata-style objects where the `name` field identifies the sensitivity of `value`.

```typescript
import { FieldRedactor, CustomObject, CustomObjectMatchType } from 'field-redactor';

const metadataCustomObject: CustomObject = {
  name: CustomObjectMatchType.Ignore,
  type: CustomObjectMatchType.Ignore,
  value: 'name'
};

const fieldRedactor = new FieldRedactor({
  secretKeys: [/email/],
  customObjects: [metadataCustomObject]
});

// name is "email" → value is redacted
await fieldRedactor.redact({ name: 'email', type: 'String', value: 'foo@bar.com', id: 12 });
// → { name: "email", type: "String", value: "REDACTED", id: 12 }

// Falsy sibling values are evaluated when the sibling key is present
const falsyNameRedactor = new FieldRedactor({
  secretKeys: [/^$/],
  customObjects: [metadataCustomObject]
});
await falsyNameRedactor.redact({ name: '', type: 'String', value: 'foo@bar.com' });
// → { name: "", type: "String", value: "REDACTED" }
```

#### Example
```typescript
import { FieldRedactor, CustomObjectMatchType } from 'field-redactor';

const myCustomObject1 = {
  shallow: CustomObjectMatchType.Shallow,
  deep: CustomObjectMatchType.Deep,
  full: CustomObjectMatchType.Full,
  delete: CustomObjectMatchType.Delete
  pass: CustomObjectMatchType.Pass,
  ignore: CustomObjectMatchType.Ignore
};

const myCustomObject2 = {
  name: CustomObjectMatchType.Ignore,
  type: CustomObjectMatchType.Ignore,
  shallowValue: "name",
  deepValue: "type",
}

const myJsonObject = {
  timestamp: "2024-12-01T22:07:26.448Z",
  userId: 271,
  data: [
    {
      shallow: "hello",
      deep: "hello",
      full: "hello",
      delete: "hello",
      pass: "hello",
      ignore: "hello"
    },
    {
      name: "email",
      type: "Secure",
      shallowValue: "foo.bar@example.com",
      deepValue: "foobar",
    },
    {
      shallow: {
        hello: "world",
        email: "foobar"
      },
      deep: {
        hello: "world",
        email: "foobar"
      },
      full: {
        hello: "world",
        email: "foobar"
      },
      delete: {
        hello: "world",
        email: "foobar"
      },
      pass: {
        hello: "world",
        email: "foobar"
      },
      ignore: {
        hello: "world",
        email: "foobar"
      }
    }
    {
      name: "email",
      type: "Secure",
      shallowValue: {
        hello: "world",
        email: "foobar"
      },
      deepValue: {
        hello: "world",
        email: "foobar"
      }
    }
  ]
};
const fieldRedactor = new FieldRedactor({
  secretKeys: [/email/],
  deepSecretKeys: [/secure/i],
  fullSecretKeys: [/meta/i],
  customObjects: [myCustomObject1, myCustomObject2]
});
const result = await fieldRedactor.redact(myJsonObject);
console.log(result);
```

##### Output
```json
{
  "timestamp": "2024-12-01T22:07:26.448Z",
  "userId": 271,
  "data": [
    {
      "shallow": "REDACTED",
      "deep": "REDACTED",
      "full": "REDACTED",
      "pass": "hello",
      "ignore": "hello"
    },
    {
      "name": "email",
      "type": "Secure",
      "shallowValue": "REDACTED",
      "deepValue": "REDACTED"
    },
    {
      "shallow": {
        "hello": "world",
        "email": "REDACTED"
      },
      "deep": {
        "hello": "REDACTED",
        "email": "REDACTED"
      },
      "full": "REDACTED",
      "pass": {
        "hello": "world",
        "email": "REDACTED"
      },
      "ignore": {
        "hello": "world",
        "email": "foobar"
      }
    }
    {
      "name": "email",
      "type": "Secure",
      "shallowValue": {
        "hello": "world",
        "email": "REDACTED"
      },
      "deepValue": {
        "hello": "REDACTED",
        "email": "REDACTED"
      }
    }
  ]
}
```
>  - Example shows both primitives and objects to highlight differences

### `ignoreBooleans` Configuration
- **Type:** `boolean`
- **Default:** `false`
- **Effect:** When `false` (default), booleans are redacted like any other primitive when their key matches a redaction rule. Set to `true` to leave booleans unchanged.

### Example
#### Code
```typescript
import { FieldRedactor } from 'field-redactor';

const myJsonObject = { 
  foo: "bar",
  fizz: false,
  buzz: true
};

// Default: booleans are redacted when their key matches a Shallow rule
const defaultRedactor = new FieldRedactor({ secretKeys: [/foo/, /fizz/, /buzz/] });
const defaultResult = await defaultRedactor.redact(myJsonObject);
// → { foo: "REDACTED", fizz: "REDACTED", buzz: "REDACTED" }

// Opt out of boolean redaction explicitly
const fieldRedactor = new FieldRedactor({
  ignoreBooleans: true,
  secretKeys: [/foo/, /fizz/, /buzz/]
});

const result = await fieldRedactor.redact(myJsonObject);
console.log(result);
```

#### Output (with `ignoreBooleans: true`)
```json
{
  "foo": "REDACTED",
  "fizz": false,
  "buzz": true
}
```

### `ignoreNullOrUndefined` Configuration
- **Type:** `boolean`
- **Default:** `true`
- **Effect:** Specifies if null or undefined values shold be redacted.
  - *Note: Ensure custom redaction function can appropriately handle null or undefined if set to false.*

### Example
#### Code
```typescript
const myJsonObject = { 
  foo: "bar",
  fizz: null,
  buzz: undefined
};
const fieldRedactor = new FieldRedactor({
  ignoreNullOrUndefined: false
});

const result = await fieldRedactor.redact(myJsonObject);
console.log(result);
```
#### Output
```json
{
  "foo": "REDACTED",
  "fizz": "REDACTED",
  "buzz": "REDACTED"
}
```

## Full Example
The following example combines Shallow, Deep, Remove, and Schema rules for realistic log redaction — including metadata entries where sensitivity is determined by a sibling `name` field.

##### Code
```typescript
import { FieldRedactor, CustomObject, CustomObjectMatchType } from 'field-redactor';
const myRedactor = (text: string) => Promise.resolve("REDACTED");
const metadataCustomObject: CustomObject = {
  name: CustomObjectMatchType.Pass,
  type: CustomObjectMatchType.Pass,
  id: CustomObjectMatchType.Shallow,
  value: "name"
};

const actionsCustomObject: CustomObject = {
  userId: CustomObjectMatchType.Pass,
  field: CustomObjectMatchType.Pass,
  action: CustomObjectMatchType.Pass,
  value: "field"
};

const fieldRedactor: FieldRedactor = new FieldRedactor({
  redactor: myRedactor,
  secretKeys: [/email/, /name/i, /someSecretData/, /children/],
  deepSecretKeys: [/accountInfo/i, /someDeepSecretData/i, /privateInfo/i],
  deleteSecretKeys: [/authKey/i],
  customObjects: [metadataCustomObject, actionsCustomObject],
  ignoreNullOrUndefined: false
});

const myJsonObjectToRedact = {
  timestamp: "2024-12-01T22:07:26.448Z",
  userId: 271,
  authKey: 12345,
  contactInfo: {
    email: "foo.bar@example.com",
    salutation: "Mr.",
    firstName: "Foo",
    lastName: "Bar",
    dob: "1980-01-01",
    backupEmail: undefined,
    preference: "email",
    lastUpdated: "2024-12-01T22:07:26.448Z"
  },
  someSecretData: ["fizz", "buzz", { deep: "is not redacted", name: "foobar" }],
  accountInfo: {
    balance: 123.45,
    institution: "FizzBuz International"
    information: {
      routingNumber: 11111111,
      acctNumber: 222222
    }
  },
  actions: [
    {
      userId: 271,
      field: "email",
      action: "CREATE",
      value: "foo.bar@example.com"
    },
    {
      userId: 271,
      field: "preference",
      action: "UPDATE",
      value: "email"
    }
  ],
  metadata: [
    {
      name: "mdn",
      type: "Number",
      id: 12,
      value: 16151112222
    },
    {
      name: "children",
      type: "Array",
      id: 20,
      value: ["John", "Paul","Ringo", "George"]
    },
    {
      name: "traceId",
      type: "String",
      id: 10,
      value: "1234-6587"
    },
    {
      name: "privateInfo",
      type: "Object",
      id: 20,
      value: {
        mySecretThings: {
          a: "foo",
          b: "bar"
        }
      }
    }
  ],
  hobbies: ["Basketball", "Baseball", "Tennis"],
  someDeepSecretData: ["fizz", "buzz", { deep: "is redacted", name: "foobar" }],
  someFullSecretData: {
    foo: "bar"
  },
  someFullSecretData2: ["a", 1, "12"]
};

const result = await fieldRedactor.redact(myJsonObject);
console.log(result);
```

##### Output
```json
{
  "timestamp": "2024-12-01T22:07:26.448Z",
  "userId": 271,
  "contactInfo": {
    "email": "REDACTED",
    "salutation": "Mr.",
    "firstName": "REDACTED",
    "lastName": "REDACTED",
    "dob": "REDACTED",
    "backupEmail": "REDACTED",
    "preference": "email",
    "lastUpdated": "2024-12-01T22:07:26.448Z",
  },
  "someSecretData": ["REDACTED", "REDACTED", { "deep": "is not redacted", "name": "REDACTED" }],
  "accountInfo": {
    "balance": "REDACTED",
    "institution": "REDACTED",
    "information": {
      "routingNumber": "REDACTED",
      "acctNumber": "REDACTED"
    }
  },
  "actions": [
    {
      "userId": 271,
      "field": "email",
      "action": "CREATE",
      "value": "REDACTED"
    },
    {
      "userId": 271,
      "field": "preference",
      "action": "UPDATE",
      "value": "email"
    }
  ],
  "metadata": [
    {
      "name": "mdn",
      "type": "Number",
      "id":  "REDACTED",
      "value": "REDACTED"
    },
    {
      "name": "children",
      "type": "Array",
      "id":  "REDACTED",
      "value": ["REDACTED", "REDACTED", "REDACTED", "REDACTED"]
    },
    {
      "name": "traceId",
      "type": "String",
      "id": 10,
      "value": "1234-6587"
    },
    {
      "name": "privateInfo",
      "type": "Object",
      "id": "REDACTED",
      "value": {
        "mySecretThings": {
          "a": "REDACTED",
          "b": "REDACTED"
        }
      }
    }
  ],
  "hobbies": ["Basketball", "Baseball", "Tennis"],
  "someDeepSecretData": ["REDACTED", "REDACTED", { "deep": "REDACTED", "name": "REDACTED" }],
  "someFullSecretData": "REDACTED",
  "someFullSecretData2": "REDACTED"
}
```
