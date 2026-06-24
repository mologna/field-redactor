# Migration: npm 1.2.x → 1.5.0

This guide covers upgrading from the last published npm line (**1.2.0**) to **1.5.0**, which bundles **v1.2.1**–**v1.3.0** git work plus Phase 2 DX polish and value-pattern redaction.

## Install

```bash
npm install field-redactor@1.5.0
# or
yarn add field-redactor@1.5.0
```

## Breaking or behavior-sensitive changes

### 1. Copy-on-write instead of full deep clone

`redact()` and `redactSync()` no longer deep-clone the entire input first. Unmodified nested objects may **share references** with the input.

```typescript
// If tests assert result.child !== input.child for untouched branches, update expectations.
// To mutate the input in place (old clone-then-mutate semantics on the copy):
new FieldRedactor({ secretKeys: [/email/], cloneInput: false });
```

### 2. Relaxed custom object schema matching

Schemas match when the input object contains **every** schema key. Extra keys on the input are allowed (previously required an exact key set in some cases).

### 3. Configuration warnings

`new FieldRedactor()` without explicit rules still redacts all values (legacy default) but now emits warnings. Use:

```typescript
FieldRedactor.createSafe({ secretKeys: [/email/i] });
// or
FieldRedactorConfigBuilder.create().shallow(/email/i).buildSafeRedactor();
// or
new FieldRedactor({ strict: true, secretKeys: [/email/i] });
```

## Recommended new APIs

| Goal | API |
| --- | --- |
| Avoid accidental full redaction | `FieldRedactor.createSafe()`, `buildSafeRedactor()` |
| Faster sync pipelines | `redactSync()`, `redactInPlaceSync()` |
| Tune regexes / schemas | `dryRunSync()` → `report.redactedPaths`, `pathRules` |
| Start from known fixtures | `presets.applicationLogging()`, `.usePreset()` |
| PII in free-text values | `valuePatterns` or `.valuePattern()` |

## Step-by-step upgrade

### Step 1 — Audit current config

```typescript
import { validateFieldRedactorConfig } from 'field-redactor';

const warnings = validateFieldRedactorConfig(yourConfig);
console.log(warnings);
```

### Step 2 — Preview on real payloads

```typescript
const redactor = FieldRedactor.createSafe(yourConfig);
const { result, report } = redactor.dryRunSync(samplePayload);
// Review report.pathRules, report.matchedSchemas, report.deletedPaths
```

### Step 3 — Switch hot paths to sync (optional)

If you use the default or `syncRedactor` and do not need async `redactor`:

```typescript
// Before
const out = await redactor.redact(payload);

// After
const out = redactor.redactSync(payload);
```

### Step 4 — Add value patterns (optional)

Only when sensitivity is in **values**, not key names:

```typescript
FieldRedactorConfigBuilder.create()
  .shallow(/email/i, /password/i)
  .valuePattern(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
  .buildSafeRedactor();
```

Value patterns run at **lowest precedence** — after schema and all key-based rules.

## Fixes you get for free

- **Falsy sibling keys** — `metadata: { name: 'email', value: '' }` redacts correctly when the sibling is present.
- **`ignoreBooleans` default** — documented as `false` (booleans are redacted unless you opt out).
- **Exported errors** — `FieldRedactorError`, `FieldRedactorConfigurationError`.
- **Stronger typing** — `JsonValue`, `RedactableInput`, generic `redact<T>()`.

## Further reading

- [Release notes v1.5.0](../release-notes/v1.5.0.md)
- [Release notes v1.3.0](../release-notes/v1.3.0.md) — detailed 1.3.0 feature breakdown
- [Anti-patterns](anti-patterns.md)
