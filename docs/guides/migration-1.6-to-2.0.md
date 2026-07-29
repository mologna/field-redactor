# Migration: npm 1.6.x → 2.0

**Status:** In progress on `chore/2x-major`. Current prerelease: **2.0.0-alpha.2** (naming, dry-run rename, safe-by-default construction). `@internal` export trim remains.

**2.0.0** will be a major release: Opaque/Remove-only naming, safer construction, smaller public type exports, and dry-run vocabulary aligned with Remove. Redaction behavior for configs that already use preferred 1.6 names is unchanged once all planned breaks land.

Canonical checklist: [docs/plans/2.0-breaking-surface.md](../plans/2.0-breaking-surface.md). Plan: [docs/plans/2.0.md](../plans/2.0.md).

## Install

```bash
# Prerelease from git / local package (not on npm)
npm install field-redactor@2.0.0-alpha.2
# or
yarn add field-redactor@2.0.0-alpha.2
```

> **2.0.0-alpha.2** is not published to the npm registry. Final **2.0.0** will use a `v2.0.0` release tag.

## Breaking changes in 2.0.0-alpha.1 / 2.0.0-alpha.2

### 1. Rename Full / Delete → Opaque / Remove

| Before (1.6) | After (2.0) |
| --- | --- |
| `fullSecretKeys` | `opaqueSecretKeys` |
| `deleteSecretKeys` | `removeSecretKeys` |
| `CustomObjectMatchType.Full` | `CustomObjectMatchType.Opaque` |
| `CustomObjectMatchType.Delete` | `CustomObjectMatchType.Remove` |
| Builder `.delete()` | `.remove()` |

Legacy aliases are **removed** (not merely deprecated). Passing `fullSecretKeys` / `deleteSecretKeys` fails validation with a clear configuration error.

```typescript
// Before
FieldRedactor.createSafe({
  fullSecretKeys: [/ssn/i],
  deleteSecretKeys: [/authToken/i]
});

// After
FieldRedactor.createSafe({
  opaqueSecretKeys: [/ssn/i],
  removeSecretKeys: [/authToken/i]
});
```

### 2. Dry-run report vocabulary

| Before | After |
| --- | --- |
| `report.deletedPaths` | `report.removedPaths` |
| `pathRules[].action === 'delete'` | `pathRules[].action === 'remove'` |

```typescript
const { report } = redactor.dryRunSync(payload);
// Before: report.deletedPaths
// After:  report.removedPaths
```

### 3. Constructor requires explicit rules

`new FieldRedactor()` / `new FieldRedactor({})` no longer redacts every value. Empty config throws `FieldRedactorConfigurationError` (same rule bar as `createSafe`).

```typescript
// Before (1.6) — redacts all + warning
new FieldRedactor();

// After — throws; use explicit rules
new FieldRedactor({ secretKeys: [/email/i] });
// or
FieldRedactor.createSafe({ secretKeys: [/email/i] });
```

## Breaking changes still planned for 2.0.0

### 4. Incidental types no longer exported from the package root

These are still exported today (marked `@internal`). Planned removal from the public export surface:

- `JsonFunction`
- `JsonLeafValue`
- `RedactablePrimitive`
- `RedactedPrimitive`
- `SecretSpecifierValue`
- `TraversableJson`

Prefer `JsonValue`, `JsonObject`, `JsonArray`, `JsonPrimitive`, `RedactableInput`, `RedactorInput` for application typing.

## Step-by-step upgrade

### Step 1 — Find legacy names

Search the codebase for:

- `fullSecretKeys`, `deleteSecretKeys`
- `CustomObjectMatchType.Full`, `CustomObjectMatchType.Delete`
- `.delete(` on the config builder
- `deletedPaths`, `action: 'delete'` / `action: "delete"`

### Step 2 — Fix construction sites

Replace bare `new FieldRedactor()` with an explicit rule list or `createSafe` / `buildSafeRedactor()`.

### Step 3 — Update dry-run consumers

Rename `deletedPaths` → `removedPaths` and treat path-rule action `'remove'` as the remove outcome.

### Step 4 — Re-validate on real payloads

```typescript
const redactor = FieldRedactor.createSafe(yourConfig);
const { result, report } = redactor.dryRunSync(samplePayload);
// Review report.redactedPaths, report.removedPaths, report.matchedSchemas, report.pathRules
```

## No action required (when already on preferred 1.6 APIs)

- `secretKeys` / `deepSecretKeys` / `opaqueSecretKeys` / `removeSecretKeys`
- `CustomObjectMatchType.Opaque` / `.Remove` / `.Deep` / `.Shallow` / `.Pass` / `.Ignore`
- Path rules, pass keys, value patterns, presets
- Sync APIs and copy-on-write behavior
- Root-only package `exports` (unchanged from 1.6)

## Links

- [Release notes v2.0.0-alpha.2](../release-notes/v2.0.0-alpha.2.md)
- [Release notes v2.0.0-alpha.1](../release-notes/v2.0.0-alpha.1.md)
- [Breaking surface checklist](../plans/2.0-breaking-surface.md)
- [2.0 plan](../plans/2.0.md)
- [Migration 1.5 → 1.6](migration-1.5-to-1.6.md)
- [Secret key modes](secret-key-modes.md)
- [Anti-patterns](anti-patterns.md)
- [CHANGELOG](../../CHANGELOG.md)
