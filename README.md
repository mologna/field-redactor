# FieldRedactor

A utility `npm` module for redacting sensitive data from JSON objects using complex, recursive evaluation logic.

It can redact JSON values based on Regular Expression matching of key values, custom object logic for PII values identified by fields other than their key, deeply redact sensitive objects, and other PII redaction strategies that more simplistic approaches cannot handle.

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


## Customization
The true power of this tool comes from its customization. FieldRedactor can be customized to redact only primtive values for certain keys, deeply redact others, while stringifying and fully redacting other keys. The redactor itself can be configured, and "Custom Objects" can be specified to handle certain object shapes in a highly specific and configurable way.

### Overview
| Config Field          | Type                            | Default                        | Effect                                                                 |
|-----------------------|---------------------------------|--------------------------------|-----------------------------------------------------------------------|
| `redactor`            | `(val: any) => Promise<string>` | `(val) => Promise.resolve("REDACTED")` | The async function to use when redacting values. When only `redactor` is set, traversal stays async. |
| `syncRedactor`        | `(val: any) => string`          | `() => "REDACTED"` (when no `redactor`) | Synchronous redactor. When provided (or when using the default), traversal avoids per-field Promise overhead. |
| `secretKeys`          | `RegExp[]`                     | `null`                         | Specifies which values at any level of the JSON object should be redacted. Objects are not deeply redacted, but primitive values in arrays are. If not specified, all values are considered secret. |
| `deepSecretKeys`      | `RegExp[]`                     | `[]`                           | Specifies keys at any level of the JSON object to be deeply redacted. All values within matching objects are fully redacted unless matching a custom object. |
| `fullSecretKeys`      | `RegExp[]`                     | `[]`                           | Specifies keys at any level of the JSON object to be stringified and fully redacted. Primarily used for objects and arrays. |
| `deleteSecretKeys`      | `RegExp[]`                     | `[]`                           | Specifies keys at any level of the JSON object to be completely deleted. |
| `customObjects`       | `CustomObject[]`               | `[]`                           | Specifies custom objects requiring fine-tuned redaction logic, such as referencing sibling keys. See the "Custom Objects" section for details. |
| `ignoreBooleans`      | `boolean`                      | `false`                        | If `true`, booleans will not be redacted even if secret. When `false` (default), booleans matching a secret key are redacted. |
| `ignoreNullOrUndefined` | `boolean`                   | `true`                         | If `true`, `null` and `undefined` values will not be redacted.        |
| `cloneInput`            | `boolean`                      | `true`                         | When `true`, `redact()` / `redactSync()` leave the input untouched via copy-on-write. Set `false` to mutate in place. |

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

### `secretKeys` Configuration
* Specifies values which should be redacted.
* __All values are considered secret if no secrets of any type are specified.__
* has lowest precedence of all secret specifiers.

#### Details
- **Type:** `RegExp[]`
- **Default:** All values considered secret unless a secret field is specified.
- **Effect:** Matches keys in objects, child objects, or array value primitives. Assessed recursively.

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

### `deepSecretKeys` Configuration
* Specifies values which should be deeply redacted
* Has higher precedence than `secretKeys`
* All children of the key will have their values redacted unless `fullSecretKey` or `customObject` has precedence.

#### Details
- **Type:** `RegExp[]`
- **Default:** `[]`
- **Effect:** Matches keys in objects or child objects and deeply redacts all values, including values in child objects or objects within arrays. 
  - _Note: has higher precedence than `secretKeys`._

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

### `fullSecretKeys` Configuration
* Specifies values which should be stringified and redacted
  * _Note: has higher precedence than `secretKeys` and `deepSecretKeys`_

#### Details
- **Type:** `RegExp[]`
- **Default:** `[]`
- **Effect:** Matches keys and stringifies + redacts their values. 
  - Has higher precedence than `secretKeys` and `deepSecretKeys` but lower precedence than `customObjects`.

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

### `deleteSecretKeys` Configuration
* Specifies values which should be completely deleted.

#### Details
- **Type:** `RegExp[]`
- **Default:** `[]`
- **Effect:** Matches keys and deletes them from output.
  - Has lower precedence than `customObjects` 

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

### `customObjects` Configuration
* **One of the most powerful features of this library and why it was written in the first place.** 
* Combining CustomObjects with secrets yields a powerful and highly customizable redaction tool capable of conditionally redacting a broad variety of input JSON objects correctly according to a user-specified schema.

#### Details
- **Type:** `CustomObject` (See `CustomObject` Schema Section)
- **Default:** `[]`
- **Effect:** Any object that matches the schema will be redacted based on its schema.
  - _Note: has highest precedence_
  - _Note: If a custom object is nested inside another, the child takes precedence_

#### Schema Matching
An input object matches a `CustomObject` schema when it contains **every key defined in the schema**. Additional keys on the input object are allowed and are not evaluated by the custom object rules.

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

#### `CustomObject` Schema
```typescript
{
  [key]: CustomObjectMatchType | string
}
```

- `key`
  - **Type:** `string`
  - **Effect:** Specifies the key to match on.
- `value`:
  - **Type:** `CustomObjectMatchType | string`
  - **Effect:** Specifies how the value should be redacted
    - `string` - names a **sibling key** on the same object. If that sibling key is present, its value is tested against the configured secret specifiers (`secretKeys`, `deepSecretKeys`, `fullSecretKeys`, `deleteSecretKeys`) to determine how this field should be redacted. Sibling key presence is checked with `hasOwnProperty`; falsy sibling values such as `""`, `0`, and `false` are supported.
    - `CustomObjectMatchType` - Redacts according to the match type.


#### `CustomObjectMatchType` Enum
Specifies how a value should be redacted in a CustomObject if not using a `string` sibling specifier.

| Key | Description |
| --- | ----------- |
| `Delete` | Delete the value from the result. |
| `Full` | Stringify value and redact. |
| `Deep` | Redact if primitive and deeply redact if object or array. |
| `Shallow` | Redact if primitive or array of primitives and revert to normal rules otherwise, including objects in arrays. |
| `Pass` | Do not redact, but revert to normal rules for child objects or objects in arrays. |
| `Ignore` | Skip evaluation entirely. |

#### Sibling Key Specifier Example
The sibling key's **value** (not its truthiness) determines whether secret rules apply. This is the pattern used for metadata-style objects where the `name` field identifies the sensitivity of `value`.

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
- **Effect:** Specifies if boolean values should be redacted when their key matches a secret specifier. When `false` (the default), booleans are redacted like any other primitive. Set to `true` to leave boolean values unchanged even when their key is considered secret.

### Example
#### Code
```typescript
import { FieldRedactor } from 'field-redactor';

const myJsonObject = { 
  foo: "bar",
  fizz: false,
  buzz: true
};

// Default: booleans are redacted when their key matches a secret specifier
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
The following example illustrates the power and utility of this library when conditionally redacting JSON output for logging or other purposes. It allows users to specify the manner of redaction, which fields should be redacted and how, and specify custom object schemas with highly configurable redaction logic based on sibling keys or set rules. I find it a quite useful tool!

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
