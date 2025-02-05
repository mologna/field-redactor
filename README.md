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

If this object is placed in a data set with many others, and only some of these objects contain PII, redaction becomes quite troublesome. One could redact all `value` fields from these objects - but this merely renders the log output useless for debugging or tracing, as all values are now redacted. The value of the `name` field determines whether or not the `value` field should be redacted. I often found myself writing custom logic to make this determination, which led to brittle code that was difficult to maintain. In the end I decided to write a new, highly configurable plug-and-play solution that could redact sensitive data in various manners while requiring only minor configuration tweaks. Enter FieldRedactor!

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
> **Note:** `null` and `undefined` values are not redacted by default.


## Customization
The true power of this tool comes from its customization. FieldRedactor can be customized to redact only primtive values for certain keys, deeply redact others, while stringifying and fully redacting other keys. The redactor itself can be configured, and "Custom Objects" can be specified to handle certain object shapes in a highly specific and configurable way.

### Overview
| Config Field          | Type                            | Default                        | Effect                                                                 |
|-----------------------|---------------------------------|--------------------------------|-----------------------------------------------------------------------|
| `redactor`            | `(val: any) => Promise<string>` | `(val) => Promise.resolve("REDACTED")` | The function to use when redacting values.                             |
| `secretKeys`          | `RegExp[]`                     | `null`                         | Specifies which values at any level of the JSON object should be redacted. Objects are not deeply redacted, but primitive values in arrays are. If not specified, all values are considered secret. |
| `deepSecretKeys`      | `RegExp[]`                     | `[]`                           | Specifies keys at any level of the JSON object to be deeply redacted. All values within matching objects are fully redacted unless matching a custom object. |
| `fullSecretKeys`      | `RegExp[]`                     | `[]`                           | Specifies keys at any level of the JSON object to be stringified and fully redacted. Primarily used for objects and arrays. |
| `deleteSecretKeys`      | `RegExp[]`                     | `[]`                           | Specifies keys at any level of the JSON object to be completely deleted. |
| `customObjects`       | `CustomObject[]`               | `[]`                           | Specifies custom objects requiring fine-tuned redaction logic, such as referencing sibling keys. See the "Custom Objects" section for details. |
| `ignoreBooleans`      | `boolean`                      | `false`                        | If `true`, booleans will not be redacted even if secret.               |
| `ignoreNullOrUndefined` | `boolean`                   | `true`                         | If `true`, `null` and `undefined` values will not be redacted.        |

### `redactor` Configuration
Configures the redactor function used when a secret is encountered. Users should typically provide this configuration.

#### Details
- **Type:** `(val: any) => Promise<string>`
- **Effect:** The function used to redact values. 
  - Value can only be null or undefined if `ignoreNullOrUndefined` is set to false. 
  - Defaults to `() => Promise.resolve('REDACTED')`.

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
  - -_Note: If a custom object is nested inside another, the child takes precedence_

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
    - `string` - checks if a sibling key with this name exists and contains a secret value. If so, redacts according to the secret specifier.
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
- **Effect:** Specifies if boolean values should be redacted.

### Example
#### Code
```typescript
import { FieldRedactor } from 'field-redactor';

const myJsonObject = { 
  foo: "bar",
  fizz: false,
  buzz: true
};
const fieldRedactor = new FieldRedactor({
  ignoreBooleans: true,
  secretKeys: [/foo/, /fizz/, /buzz/]
});

const result = await fieldRedactor.redact(myJsonObject);
console.log(result);
```

#### Output
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
import { FieldRedactor } from 'field-redactor';
const myRedactor = (text: string) => Promise.resolve("REDACTED");
const metadataCustomObject: CustomObject = {
  name: CustomObjectMatchTypes.Pass,
  type: CustomObjectMatchTypes.Pass,
  id: CustomObjectMatchTypes.Shallow,
  value: "name"
};

const actionsCustomObject: CustomObject = {
  userId: CustomObjectMatchTypes.Pass,
  field: CustomObjectMatchTypes.Pass,
  action: CustomObjectMatchTypes.Pass,
  value: "field"
}

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
