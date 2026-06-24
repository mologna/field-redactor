# Configuration reference

## Overview

| Doc label | Config field | Type | Default | Effect |
|-----------|--------------|------|---------|--------|
| — | `redactor` | `(val) => Promise<string>` | `"REDACTED"` async | Custom async redactor; enables async traversal when sole redactor |
| — | `syncRedactor` | `(val) => string` | `"REDACTED"` sync | Sync redactor; enables `redactSync()` without per-field Promises |
| **Shallow** | `secretKeys` | `RegExp[]` | `null` | Redact matching scalar values; if no rules at all, everything matches |
| **Deep** | `deepSecretKeys` | `RegExp[]` | `[]` | Deeply redact all primitives under matching keys |
| **Opaque** | `fullSecretKeys` | `RegExp[]` | `[]` | Stringify and redact entire values |
| **Remove** | `deleteSecretKeys` | `RegExp[]` | `[]` | Delete matching keys |
| **Schema** | `customObjects` | `CustomObject[]` | `[]` | Per-shape rules; see [metadata guide](../guides/metadata-redaction.md) |
| — | `schemaNames` | `string[]` | — | Optional labels parallel to `customObjects` for `dryRun` reports |
| — | `ignoreBooleans` | `boolean` | `false` | Skip boolean redaction when `true` |
| — | `ignoreNullOrUndefined` | `boolean` | `true` | Skip null/undefined redaction when `true` |
| — | `cloneInput` | `boolean` | `true` | Copy-on-write for `redact()` / `redactSync()` |
| — | `strict` | `boolean` | `false` | Throw on config warnings when `true` |
| — | `onConfigWarning` | `(msg) => void` | — | Callback for non-fatal config warnings |

## FieldRedactor API

| Method | Returns | Notes |
|--------|---------|-------|
| `redact(value)` | `Promise<T>` | Copy-on-write by default |
| `redactSync(value)` | `T` | Sync path when no async-only `redactor` |
| `redactInPlace(value)` | `Promise<void>` | Mutates traversable input |
| `redactInPlaceSync(value)` | `void` | Sync in-place |
| `dryRun(value)` | `Promise<{ result, report }>` | Redact + path audit |
| `dryRunSync(value)` | `{ result, report }` | Sync dry run |
| `configWarnings` | `readonly string[]` | Warnings from construction |

### Static factories

- `FieldRedactor.createSafe(config)` — requires at least one rule; throws `FieldRedactorConfigurationError` otherwise
- `new FieldRedactor(config)` — legacy; no rules ⇒ redact everything

## Builder API

```typescript
import { CustomObjectMatchType, FieldRedactorConfigBuilder } from 'field-redactor';

const redactor = FieldRedactorConfigBuilder.create()
  .usePreset(presets.applicationLogging())
  .shallow(/ssn/i)
  .deep(/accountInfo/i)
  .opaque(/rawPayload/i)
  .remove(/authKey/i)
  .schema(metadataSchema, { name: 'metadata-entry' })
  .syncRedactor((val) => `REDACTED:${val}`)
  .strict()
  .buildSafeRedactor();
```

Methods: `shallow`, `deep`, `opaque`, `remove` / `delete`, `schema`, `usePreset`, `redactor`, `syncRedactor`, `ignoreBooleans`, `ignoreNullOrUndefined`, `cloneInput`, `strict`, `onConfigWarning`, `build`, `buildRedactor`, `buildSafeRedactor`.

## Configuration validation

```typescript
import { validateFieldRedactorConfig } from 'field-redactor';

const warnings = validateFieldRedactorConfig({ secretKeys: [/email/] });
```

Warnings include: no rules configured, duplicate regex across key groups, global regex flag, missing schema sibling keys, overlapping schemas. Set `strict: true` to throw on warnings.

## Presets

```typescript
import { FieldRedactor, presets } from 'field-redactor';

FieldRedactor.createSafe({
  ...presets.applicationLogging(),
  secretKeys: [/ssn/] // extend defaults
});
```

| Preset | Contents |
| --- | --- |
| `loggingMetadata()` | `{ name, type, value }` schema + auth key removal |
| `applicationLogging()` | Common PII patterns + event metadata schema |
| `keyValueEntries()` | `{ key, value }` schema |

## Dry run report

```typescript
type DryRunReport = {
  redactedPaths: string[];
  deletedPaths: string[];
  matchedSchemas: { path: string; schemaIndex: number; schemaName?: string }[];
  pathRules: {
    path: string;
    action: 'redact' | 'delete';
    rule: 'schema' | 'opaque' | 'deep' | 'remove' | 'shallow' | 'default';
    pattern?: string;
    schemaIndex?: number;
    schemaName?: string;
  }[];
};
```

`pathRules` explains **why** each path changed (which rule matched). Use alongside `redactedPaths` / `deletedPaths` for iteration.

## Errors

| Class | When |
| --- | --- |
| `FieldRedactorError` | Redaction failure at runtime |
| `FieldRedactorConfigurationError` | Invalid config, `createSafe()` with no rules, `strict` warnings |

## `redactor` / `syncRedactor`

Provide `syncRedactor` (or use the default) when you want `redactSync()` without Promise overhead. Async-only `redactor` keeps `redact()` fully async.

```typescript
import * as crypto from 'crypto';
import { FieldRedactor, Redactor } from 'field-redactor';

const redactor: Redactor = (val) =>
  Promise.resolve(crypto.createHash('sha256').update(String(val)).digest('hex'));

const fieldRedactor = new FieldRedactor({ redactor, secretKeys: [/email/] });
```

## Object schemas (`customObjects`)

Highest precedence. See [Metadata redaction](../guides/metadata-redaction.md) for sibling-key patterns and [Secret key modes](../guides/secret-key-modes.md) for key-based modes.

## Guides

- [Secret key modes](../guides/secret-key-modes.md)
- [Metadata redaction](../guides/metadata-redaction.md)
- [Anti-patterns](../guides/anti-patterns.md)
