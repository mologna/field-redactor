# Metadata redaction

Many log payloads encode sensitivity in **sibling fields** rather than key names:

```json
{
  "name": "email",
  "type": "String",
  "value": "foo.bar@example.com"
}
```

Redacting every `value` field destroys useful debug output. Instead, use a **Schema** (`customObjects`) so `value` is redacted only when `name` matches your Shallow / Deep / Opaque / Remove rules.

## Schema matching

An object matches a `CustomObject` schema when it contains **every key defined in the schema**. Extra keys on the input are allowed.

When multiple schemas match, the one with the **most keys** wins.

```typescript
import { CustomObject, CustomObjectMatchType } from 'field-redactor';

const metadataSchema: CustomObject = {
  name: CustomObjectMatchType.Ignore,
  type: CustomObjectMatchType.Ignore,
  value: 'name' // sibling key: test `name`'s value against secretKeys
};

// Matches: { name: "email", type: "String", value: "foo@bar.com", id: 12 }
// Does not match: { name: "email", value: "foo@bar.com" } — missing required "type"
```

## Sibling key rules

When a schema field is a **string** (e.g. `value: 'name'`), that string names a sibling key. The sibling's **value** is tested against `secretKeys`, `deepSecretKeys`, `fullSecretKeys`, and `deleteSecretKeys`.

Falsy sibling values (`""`, `0`, `false`) are evaluated when the sibling key is present.

```typescript
import { CustomObjectMatchType, FieldRedactor } from 'field-redactor';

const fieldRedactor = new FieldRedactor({
  secretKeys: [/email/],
  customObjects: [
    {
      name: CustomObjectMatchType.Ignore,
      type: CustomObjectMatchType.Ignore,
      value: 'name'
    }
  ]
});

await fieldRedactor.redact({ name: 'email', type: 'String', value: 'foo@bar.com', id: 12 });
// → value redacted, id unchanged

await fieldRedactor.redact({ name: 'traceId', type: 'String', value: 'abc-123', id: 10 });
// → value unchanged
```

## Builder with named schemas

Name schemas to improve `dryRun` reports:

```typescript
import { CustomObjectMatchType, FieldRedactorConfigBuilder } from 'field-redactor';

const redactor = FieldRedactorConfigBuilder.create()
  .shallow(/email/i, /password/i, /phone/i)
  .remove(/authKey/i)
  .schema(
    { name: CustomObjectMatchType.Ignore, type: CustomObjectMatchType.Ignore, value: 'name' },
    { name: 'metadata-entry' }
  )
  .buildSafeRedactor();

const { report } = redactor.dryRunSync({
  metadata: [{ name: 'email', type: 'String', value: 'alice@example.com' }]
});
// report.matchedSchemas → [{ path: 'metadata[0]', schemaIndex: 0, schemaName: 'metadata-entry' }]
```

## Per-field modes (`CustomObjectMatchType`)

Inside a schema, use enum values instead of sibling strings:

| Enum | Doc label | Effect |
| --- | --- | --- |
| `Delete` | Remove | Delete the field |
| `Full` | Opaque | Stringify and redact |
| `Deep` | Deep | Deep redaction |
| `Shallow` | Shallow | Redact scalar / primitive arrays |
| `Pass` | — | Revert to normal traversal for nested content |
| `Ignore` | — | Skip the field |

## Preset: logging metadata

```typescript
import { FieldRedactor, presets } from 'field-redactor';

const redactor = FieldRedactor.createSafe({
  ...presets.loggingMetadata(),
  secretKeys: [/email/i, /ssn/i]
});
```

`presets.loggingMetadata()` includes `{ name, type, value }` schema and `deleteSecretKeys: [/authKey/i]`.

## Related

- [Secret key modes](secret-key-modes.md) — Shallow / Deep / Opaque / Remove
- [Configuration reference](../reference/config.md) — full schema reference and examples
