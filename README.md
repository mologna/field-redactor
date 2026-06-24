# FieldRedactor

A TypeScript library for redacting PII from nested JSON using regex key rules, object **schemas** (sibling-key patterns), and configurable redaction modes.

## Install

```bash
npm install field-redactor
# or
yarn add field-redactor
```

## Quick start

```typescript
import { CustomObjectMatchType, FieldRedactor, FieldRedactorConfigBuilder } from 'field-redactor';

// Recommended: explicit rules via createSafe or the builder
const redactor = FieldRedactorConfigBuilder.create()
  .shallow(/email/i, /password/i)
  .remove(/authKey/i)
  .schema(
    { name: CustomObjectMatchType.Ignore, type: CustomObjectMatchType.Ignore, value: 'name' },
    { name: 'metadata-entry' }
  )
  .buildSafeRedactor();

const result = redactor.redactSync({
  email: 'alice@example.com',
  authKey: 'secret',
  metadata: [{ name: 'email', type: 'String', value: 'alice@example.com' }]
});
```

`redact()` / `redactSync()` leave the input untouched by default (copy-on-write). Primitives, `Date`, and `null`/`undefined` at the root are returned unchanged.

### Preview changes with `dryRun`

```typescript
const { result, report } = redactor.dryRunSync(payload);
// report.redactedPaths, report.deletedPaths, report.matchedSchemas, report.pathRules
```

## Start here

```
Do you know which JSON keys are always sensitive?
  ├─ yes → Shallow / Deep / Opaque / Remove (see secret key modes guide)
  └─ only sometimes → shaped objects like { name, value }? → Schema rules (see metadata guide)
```

**Precedence:** Schema → Opaque → Deep → Remove → Shallow

| Concept | Config field |
| --- | --- |
| Shallow | `secretKeys` |
| Deep | `deepSecretKeys` |
| Opaque | `fullSecretKeys` |
| Remove | `deleteSecretKeys` |
| Schema | `customObjects` |

Use `FieldRedactor.createSafe({ ... })` or `FieldRedactorConfigBuilder` so you never accidentally redact every field. `new FieldRedactor()` without rules still redacts all values (legacy default).

## Documentation

| Guide | Description |
| --- | --- |
| [Secret key modes](docs/guides/secret-key-modes.md) | Shallow, Deep, Opaque, Remove with examples |
| [Metadata redaction](docs/guides/metadata-redaction.md) | `{ name, value }` schemas and sibling-key rules |
| [Anti-patterns](docs/guides/anti-patterns.md) | Common config mistakes and fixes |
| [Value-pattern redaction](docs/guides/value-pattern-redaction.md) | Detect PII in free-text field values |
| [Configuration reference](docs/reference/config.md) | Full option table, API, presets, validation |
| [Release notes](docs/release-notes/README.md) | Per-version notes for every git tag |

## API surface

```typescript
import {
  FieldRedactor,
  FieldRedactorConfigBuilder,
  FieldRedactorConfigurationError,
  FieldRedactorError,
  presets,
  validateFieldRedactorConfig
} from 'field-redactor';

import type { DryRunPathRule, RedactionRuleLabel, MatchedSchemaReport } from 'field-redactor';
```

- **Sync:** `redactSync()`, `redactInPlaceSync()`, `dryRunSync()`
- **Async:** `redact()`, `redactInPlace()`, `dryRun()` (sync path when no async-only `redactor`)
- **Presets:** `presets.loggingMetadata()`, `presets.applicationLogging()`, `presets.keyValueEntries()`

## Why this library exists

Many log payloads encode sensitivity in sibling fields rather than key names — for example `{ name: "email", value: "user@example.com" }`. FieldRedactor matches object **schemas** and applies rules based on a sibling's value. See [Metadata redaction](docs/guides/metadata-redaction.md) for the full pattern.
