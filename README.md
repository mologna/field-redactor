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
Basic usage of the FieldRedactor is straightforward but not recommended. Object redaction can be performed either in-place or return the redacted object:

```typescript
import { FieldRedactor } from 'field-redactor';
const myJsonObject = { foo: "bar", fizz: null };
const fieldRedactor = new FieldRedactor();

// return redacted result
const result = await fieldRedactor.redact(myJsonObject);
console.log(myJsonObject); // { foo: "bar", fizz: null }
console.log(result); // { foo: "REDACTED", fizz: null }

// redact in place
await fieldRedactor.redactInPlace(myJsonObject);
console.log(myJsonObject); // { foo: "REDACTED", fizz: null }
```
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
Used to specify primitive that should be redacted. If none of `secretKeys`, `deepSecretKeys`, or `fullSecretKeys` specified then all values are considered secret. Users should almost always specify at least one of these three fields. Has the lowest precedence of all configurable secret fields.

#### Details
- **Type:** `RegExp[]`
- **Default:** All values considered secret
  - If `deepSecretKeys` or `fullSecretKeys` specified, defaults to `[]`
- **Effect:** Matches keys in objects or child objects and redacts their values, if primitive. Arrays are processed recursively, with primitives redacted. 
  - If the value is an object it will be assessed using the same logic, regardless of if its key value is a secret.
  - if an array value is an object it will be assessed using the same logic, regardless of if its key value is a secret.
  - Has lowest precedence when compared to `deepSecretKeys`, `fullSecretKeys`, and `customObjects` configurations.

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
  },
  someSecretData: ["fizz", "buzz", { deep: "is not redacted", name: "foobar" }],
  hobbies: ["Basketball", "Baseball", "Tennis"]
}
const fieldRedactor = new FieldRedactor({
  secretKeys: [/email/i, /name/i, /someSecretData/i, /contactInfo/i],
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
    "Salutation": "Mr.",
    "preference": "email",
    "lastUpdated": "2024-12-01T22:07:26.448Z"
  },
  "someSecretData": ["REDACTED", "REDACTED", { "deep": "is not redacted", "name": "REDACTED" }],
  "hobbies": ["Basketball", "Baseball", "Tennis"]
}
```

> - contactInfo was not redacted despite being a RegExp match as it is not a primitive.
> - `email`, `firstName`, and `lastName` fields were redacted in contactInfo as they matched RegExes
> - primitives in `someSecretData` array value were redacted
> - object in `someSecretData` was evaluated separate from primitives in the same array

### `deepSecretKeys` Configuration
Used to specify secrets which should be deeply redacted. Values which are objects or arrays will have all their values redacted, including child objects and arrays, unless identified as a `fullSecretKey` or `customObject` which take higher precedence.

#### Details
- **Type:** `RegExp[]`
- **Default:** `[]`
- **Effect:** Matches keys in objects or child objects and deeply redacts all values, including values in child objects or objects within arrays. 
  - Has higher precedence than `secretKeys` but lower precedence than `fullSecretKeys` and `customObjects`.

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
    lastUpdated: "2024-12-01T22:07:26.448Z",
    lastUpdatedBy: {
      firstName: "John",
      lastName: "Doe",
      id: "12345"
    }
  },
  someSecretData: ["fizz", "buzz", { deep: "FOO", name: "BAR" }],
  hobbies: ["Basketball", "Baseball", "Tennis", {contactInfo: "foobar"}]
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
    "preference": "REDACTED",
    "lastUpdated": "REDACTED",
    "lastUpdatedBy": {
      "firstName": "REDACTED",
      "lastName": "REDACTED",
      "id": "REDACTED"
    }
  },
  "someSecretData": ["REDACTED", "REDACTED", { "deep": "REDACTED", "name": "REDACTED" }],
  "hobbies": ["Basketball", "Baseball", "Tennis", { "contactInfo": "REDACTED" }]
}
```
> - All values in `contactInfo` were redacted, including deep children
> - All values in `someSecretData` were redacted, including object values

### `fullSecretKeys` Configuration
Specifies values which should be stringified and passed to the redactor function. Has higher precedence than other secret types but lower precedence than `customObjects`. However, if value is stringified and contains a child object which is a custom object then it will, by definition, not be noticed.

#### Details
- **Type:** `RegExp[]`
- **Default:** `[]`
- **Effect:** Matches keys in objects or child objects and stringifies and fully redacts their values. 
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
  },
  someSecretData: ["fizz", "buzz", { deep: "foo", name: "bar" }],
  hobbies: ["Basketball", "Baseball", "Tennis"]
}
const fieldRedactor = new FieldRedactor({
  fullSecretKeys: [/someSecretData/i, /contactInfo/i],
});
const result = await fieldRedactor.redact(myJsonObject);
console.log(result);
```

##### Output
```json
{
  "timestamp": "2024-12-01T22:07:26.448Z",
  "userId": 271,
  "contactInfo": "REDACTED",
  "someSecretData": "REDACTED",
  "hobbies": ["Basketball", "Baseball", "Tennis"]
}
```
> - Entirity of `contactInfo` was redacted.
> - Entirity of `someSecretData` was redacted.

### `customObjects` Configuration
**One of the most powerful features of this library and why it was written in the first place.** Combining `secretKeys`, `deepSecretKeys`, `fullSecretKeys`, and `customObjects` yields a powerful and highly customizable redaction tool capable of conditionally redacting a broad variety of input JSON objects correctly according to a single schema configuration.

#### Details
- **Type:** `CustomObject` (See `CustomObject` Schema Section)
- **Default:** `[]`
- **Effect:** Any object that matches the schema will be considered a custom object and redacted based on the schema configuration.
  - Priority supercedes all others. If a `CustomObject` is nested inside a `deepSecretKey` value then the `CustomObject` configuration takes precedence.
  - If a `CustomObject` is found inside another `CustomObject` then the new `CustomObject` takes precedence.

#### `CustomObject` Schema
A custom object takes the following format:
```typescript
{
  [key]: CustomObjectMatchType | string
}
```

- `key`
  - **Type:** `string`
  - **Effect:** Specifies the key for a custom object
- `value`:
  - **Type:** `CustomObjectMatchType | string`
  - **Effect:** Specifies how the value should be redacted
    - `string` - checks if the sibling key with this name has a value which is a `secretKey`, `deepSecretKey`, or `fullSecretKey` and redacts accordingly
    - `CustomObjectMatchType` - Redacts according to the match type. See `CustomObjectMatchType` Enum Section.


#### `CustomObjectMatchType` Enum
| Key | Description |
| --- | ----------- |
| `Full` | Stringify value and redact. Functions identical to `fullSecretKeys`. |
| `Deep` | Redact if primitive, deeply redact all values and children if object or array. Functions identical to `deepSecretKeys`. |
| `Shallow` | Redact if primitive or array of primitives and revery to normal evaluation if object or array contains object. Functions identical to `secretKeys`. |
| `Pass` | Do not redact if primitive value and revert to normal rules if an object. |
| `Ignore` | Do not redact if primitive and skip evaluation entirely if object or array. |

#### Example
```typescript
import { FieldRedactor } from 'field-redactor';

const myCustomObject = {
  name: CustomObjectMatchType.Ignore,
  type: CustomObjectMatchType.Ignore,
  significance: CustomObjectMatchType.Ignore,
  shallowValue: "name",
  deepValue: "type",
  fullValue: "significance"
  shallow: CustomObjectMatchType.Shallow,
  deep: CustomObjectMatchType.Deep,
  full: CustomObjectMatchType.Full,
  pass: CustomObjectMatchType.Pass,
  ignore: CustomObjectMatchType.Ignore
};

const myJsonObject = {
  timestamp: "2024-12-01T22:07:26.448Z",
  userId: 271,
  data: [
    {
      name: "email",
      type: "Secure",
      significance: "meta"
      shallowValue: "foo.bar@example.com",
      deepValue: "foobar",
      fullValue: "hello",
      shallow: "hello",
      deep: "hello",
      full: "hello",
      pass: "hello",
      ignore: "hello"
    },
    {
      name: "email",
      type: "Secure",
      significance: "meta",
      shallowValue: {
        hello: "world",
        email: "foobar"
      },
      deepValue: {
        hello: "world",
        email: "foobar"
      },
      deepValue: {
        hello: "world",
        email: "foobar"
      },
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
      pass: {
        hello: "world",
        email: "foobar"
      },
      ignore: {
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
  customObjects: [myCustomObject]
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
      "name": "email",
      "type": "Secure",
      "shallowValue": "REDACTED",
      "deepValue": "REDACTED",
      "fullValue": "REDACTED",
      "shallow": "REDACTED",
      "deep": "REDACTED",
      "full": "REDACTED",
      "pass": "hello",
      "ignore": "hello"
    },
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
      },
      "fullValue": "REDACTED",
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
  ]
};
```
> - Both objects in the data array matched the custom object and were redacted accordingly
>   - The first object contains only primitives whereas the second contains objects to highlight the differences
> - `name` and `type` field were never redacted in either object because `CustomObjectMatchType` was `Ignore`
> - `shallowValue`, `deepValue`, and `fullValue` had string key specifiers which matched a `shallowKey`, `deepSecretKey`, and `fullSecretKey`, respectively, and were redacted according to those rules.
> - `shallow`, `deep`, `full`, `pass`, and `ignore` fields were redacted according to their `CustomObjectMatchType` value specified in the schema. 

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
  customObjects: [metadataCustomObject, actionsCustomObject],
  ignoreNullOrUndefined: false
});

const myJsonObjectToRedact = {
  timestamp: "2024-12-01T22:07:26.448Z",
  userId: 271,
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
