# FieldRedactor

A utility `npm` module for redacting sensitive data from JSON objects using complex, recursive evaluation logic.

It can redact JSON values based on Regular Expression matching of key values, custom object logic for PII values identified by fields other than their key, deeply redact sensitive objects, and other PII redaction strategies that more simplistic approaches cannot handle.

# History
In many instances redaction of sensitive data from log output is fairly straightforward and can be accomplished through existing redaction libraries. However, I often encountered scenarios where such simplistic approaches were not sufficient. Take for example the following object:
```
{
  "name": "email",
  "type": "String",
  "value": "foo.bar@example.com"
}
```
If this object is placed in a data set with many others, and only it and a few others have sensitive PII, redaction becomes quite troublesome. Of course, one could redact all `value` fields from these objects, but this creates another problem when using log data to trace or debug, as it has now all been redacted. The conditional determination of whether or not I want to redact the value lies in its `name` field, and I often found myself writing custom logic for specific types of objects that became brittle and a code maintenance nightmare. So I decided to write my own, more manageable plug-and-play solution that would require only minor configuration tweaks instead. Enter FieldRedactor!

# Basic Usage
Basic usage of the FieldRedactor is straightforward but not recommended:

```
const myJsonObject = { foo: "bar" };
const fieldRedactor = new FieldRedactor();
const result = await fieldRedactor.redact(myJsonObject) 
console.log(result); // { foo: "REDACTED" }
```

There are far more performant ways to perform global value redaction - the power of this tool comes from its customization.

# Customization

## Overview
| Config Field | Type | Default | Effect |
| ------------ | ---- | ------- | ------ |
| secretKeys   | RegExp[] | null | Specifies which values at any level of the JSON object should be redacted. Objects are not deeply redacted, but primitive values in arrays are. If not specified all values are considered secret. |
| deepSecretKeys | RegExp[] | [] | Specifies which values at any level of the JSON object shold be deeply redacted. All values will be redacted and all children objects will have their values fully redacted unless matching a custom object. |
| redactor | (val: any) => Promise\<string\> | (val: any) => Promise.resolve("REDACTED") | The function to use when redacting values.
| ignoreBooleans | boolean | false | If true booleans will not be redacted even if secret. |
| ignoreDates | boolean | false| If true Dates/Date Strings will not be redacted even if secret. |
| customObjects | CustomObject | [] | Specifies custom objects which require more fine-tuned redaction logic such as referencing sibling keys. See custom objects section. |


## secretKeys Configuration 
* type: `RegExp[]`
* If the key of an object or child object is a regular expression match its value will be redacted.
* If the value of a `secretKey` is an object it will be assessed using identical logic.
* If the value of a `secretKey` is an array then all primitives will be redacted, but objects will be assessed using the same logic.

### Example
```
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
Yields the following result:
```
{
  timestamp: "2024-12-01T22:07:26.448Z",
  userId: 271,
  contactInfo: {
    email: "REDACTED",
    firstName: "REDACTED",
    lastName: "REDACTED",
    Salutation: "Mr.",
    preference: "email",
    lastUpdated: "2024-12-01T22:07:26.448Z"
  },
  someSecretData: ["REDACTED", "REDACTED", { deep: "is not redacted", name: "REDACTED" }],
  hobbies: ["Basketball", "Baseball", "Tennis"]
}
```
* contactInfo was not fully redacted despite being specified as a secret key
* email, firstName, and lastName fields were redacted in contactInfo as they matched regular expressions
* primitives in `someSecretData` were redacted
* Only the `name` field in the object in `someSecretData` was redacted as it was a regular expression match.

## deepSecretKeys Configuration
* type: `RegExp[]`
* If the key of an object or child object is a regular expression match its value will be redacted.
* If the value is an object then all values in that object - and its children - will be redacted (unless a custom object match).
* If the value is an array then all values in that array - and their children - will be redacted (unless a custom object match).
### Example
```
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
  deepSecretKeys: [/someSecretData/i, /contactInfo/i],
});
const result = await fieldRedactor.redact(myJsonObject);
console.log(result);
```
Yields the following result:
```
{
  timestamp: "2024-12-01T22:07:26.448Z",
  userId: 271,
  contactInfo: {
    email: "REDACTED",
    firstName: "REDACTED",
    lastName: "REDACTED",
    Salutation: "REDACTED",
    preference: "REDACTED",
    lastUpdated: "REDACTED"
  },
  someSecretData: ["REDACTED", "REDACTED", { deep: "REDACTED", name: "REDACTED" }],
  hobbies: ["Basketball", "Baseball", "Tennis"]
}
```
* Unlike `secretKeys`, all values in `contactInfo` were redacted as it matched the `deepSecretKeys` regular expression.
* Similarly, all primitive values in `someSecretData` were redacted and all object values were likewise redacted.

## customRedactor Configuration
* type: `(val: any) => Promise<string>`
* Takes in a primitive value, `Date`, or `Function` (if for some reason you have those) from the JSON object and returns a redacted value
* If user has set the `allowNullOrUndefined` flag to true then the function should account for this possibility
* **Users should provide this in most cases.**

### Example
```
import * as crypto from 'crypto';
const redactor: Redactor = (val: any) => Promise.resolve(crypto.createHash('sha256').update(val.toString()).digest('hex'));
const fieldRedactor = new FieldRedactor({
  redactor
});
const result = await redactor.redact({foo: "bar"});
console.log(result); // 'fcde2b2edba56bf408601fb721fe9b5c338d10ee429ea04fae5511b68fbf8fb9'
```

## customObjects Configuration
**One of the most powerful features of this library and why it was written in the first place.**
* type: `CustomObject[]`
* Any object that matches this custom object will be redacted based on the custom object configuration.
* **Priority supercedes all other redactions**
  * if custom object located in a deeply nested `deepSecretKey` object then it will be evaluated according to custom object rules, not `deepSecretKey` rules.
* **CustomObjects MUST be an exact match**
  * If a key exists which is not present in the object being evaluated it is not a match
  * If the object being evaluated contains an extra key it is not a match

### Schema
A custom object takes the following format:
```
{
  [key]: true | false | string | CustomObject
}
```
* key: Specifies the key to match on
* `true` - always redact
* `false` - never redact
* `string` redact if the sibling key with this name has a secret value
* `CustomObject` Custom Objects can be nested.

#### Example
```
const myCustomObject = {
  name: false,
  type: false,
  id: true,
  value: "name"
};

const myJsonObject = {
  timestamp: "2024-12-01T22:07:26.448Z",
  userId: 271,
  data: [
    {
      name: "email",
      type: "String",
      id: 1122,
      value: "foo.bar@example.com"
    },
    {
      name: "message",
      type: "String",
      id: 1122,
      value: "Hello, World!"
    }
  ]
};
const fieldRedactor = new FieldRedactor({
  secretKeys: [/email/],
  customObjects: [myCustomObject]
});
const result = await fieldRedactor.redact(myJsonObject);
console.log(result);
```

Yields the following to the console:
```
{
  timestamp: "2024-12-01T22:07:26.448Z",
  userId: 271,
  data: [
    {
      name: "email",
      type: "String",
      id: "REDACTED",
      value: "REDACTED"
    },
    {
      name: "message",
      type: "String",
      id: "REDACTED",
      value: "Hello, World!"
    }
  ]
};
```
* Both objects in the data array matched the custom object and were redacted accordingly
* `name` and `type` field were never redacted as the custom object specified `false`
* `id` field was always redacted as the custom object specified `true`
* `value` field was conditionally redacted based on the value for field `"name"` as specified by the custom object
  * It was redacted in the first object because the `"name"` value was `"email"`, which was a secret.
  * It was *not* redacted in the second object because the `"name"` value was `"message"` which was not a secret.

# Full Example Using All Configurations
The following example illustrates the power and utility of this library when conditionally redacting JSON output for logging or other purposes. It allows users to specify the manner of redaction, which fields should be redacted, which fields should be deeply redacted, whether or not Dates should be redacted, and specify custom object logic where the key identifying whether or not a specific field should be redacted may not be the key for the field itself. I find it a quite useful tool!

```
const myRedactor = (text: string) => Promise.resolve("REDACTED");
const metadataCustomObject = {
  name: false,
  type: false,
  id: true,
  value: "name"
};

const actionsCustomObject = {
  userId: false,
  field: false,
  action: false,
  value: "field"
}

const fieldRedactor = new FieldRedactor({
  redactor: myRedactor,
  secretKeys: [/email/, /name/i, /someSecretData/, /children/],
  deepSecretKeys: [/accountInfo/i, /someDeepSecretData/i],
  customObjects: [metadataCustomObject, actionsCustomObject],
  redactNullOrUndefined: true,
  redactDates: true
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
      type: Array,
      id: 20,
      value: ["John, "Paul","Ringo", "George"]
    }
  ],
  hobbies: ["Basketball", "Baseball", "Tennis"],
  someDeepSecretData: ["fizz", "buzz", { deep: "is redacted", name: "foobar" }]
  "
}

const result = await fieldRedactor.redact(myJsonObject);
console.log(result);
```

Yields the following to the console:
```
{
  timestamp: "2024-12-01T22:07:26.448Z",
  userId: 271,
  contactInfo: {
    email: "REDACTED",
    salutation: "Mr.",
    firstName: "REDACTED",
    lastName: "REDACTED",
    dob: "REDACTED",
    backupEmail: "REDACTED",
    preference: "email",
    lastUpdated: "2024-12-01T22:07:26.448Z",
  },
  someSecretData: ["REDACTED", "REDACTED", { deep: "is not redacted", name: "REDACTED" }],
  accountInfo: {
    balance: "REDACTED",
    institution: "REDACTED",
    information: {
      routingNumber: "REDACTED",
      acctNumber: "REDACTED"
    }
  },
  actions: [
    {
      userId: 271,
      field: "email",
      action: "CREATE",
      value: "REDACTED"
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
      id:  "REDACTED",
      value: "REDACTED"
    },
    {
      name: "children",
      type: Array,
      id:  "REDACTED",
      value: ["REDACTED", "REDACTED", "REDACTED", "REDACTED"]
    }
  ],
  hobbies: ["Basketball", "Baseball", "Tennis"],
  someDeepSecretData: ["REDACTED", "REDACTED", { deep: "REDACTED", name: "REDACTED" }]
  "
}
```
* All data in `accountInfo` was redacted, including child objects, as it was a match for a `deepSecretKey`
* Only data in `contactInfo` which matched a `secretKey` was redacted
* Object data in someSecretData was only redacted if the key was a `secretKey`
* All object data in `someDeepSecretData` was redacted as it was specified as a `deepSecretKey`.
* object data in `actions` matched the `actionsCustomObject` so the value was conditionally redacted if the `field` value was a secret
* object data in `metadata` matched the `metadataCustomObject` so the value was conditionally redacted if the `name` value was a secret

---

# Feature Development Chart
Features are ordered by priority.

| Feature | Status | Comments |
| ------- | ------ | -------- |
| Asynchronous Support | **Complete** | Allow for asynchronous encryption schemes |
| Full Redaction | **In Progress** | Allow the entire array/object to be stringified and redacted
| Custom Object DeepSecret | Not Started | Allow CustomObjects to utilize DeepSecret logic when encrypting values, not just Secret logic |
| Custom Object Pass-Through | Not Started | Allow a fourth option in CustomObjects to denote that key should be evaluated by normal rules

