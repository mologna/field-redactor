# Migration: npm 1.5.x → 1.6.x

**1.6.0** is a minor release: new features and aliases with no required config changes for typical upgrades from **1.5.0**. **1.6.1**–**1.6.3** are patches (install only; see [v1.6.1](../release-notes/v1.6.1.md), [v1.6.2](../release-notes/v1.6.2.md), [v1.6.3](../release-notes/v1.6.3.md)).

## Install

```bash
npm install field-redactor@1.6.3
# or
yarn add field-redactor@1.6.3
```

## What you can adopt (optional)

### Path rules and pass keys

```typescript
FieldRedactor.createSafe({
  pathRules: [{ path: 'metadata.*.value', mode: 'shallow' }],
  passKeys: [/^id$/]
});
```

See [Path rules & allowlists](path-rules.md).

### Preferred Opaque / Remove names

| Prefer | Alias in 1.6 (removed in 2.0) |
| --- | --- |
| `opaqueSecretKeys` | `fullSecretKeys` |
| `removeSecretKeys` | `deleteSecretKeys` |
| `CustomObjectMatchType.Opaque` | `CustomObjectMatchType.Full` |
| `CustomObjectMatchType.Remove` | `CustomObjectMatchType.Delete` |

Builder methods `.opaque()` / `.remove()` write `opaqueSecretKeys` / `removeSecretKeys`. In 1.6, legacy `fullSecretKeys` / `deleteSecretKeys` remained accepted and were normalized internally; **2.0 removes those aliases** (see [migration 1.6 → 2.0](migration-1.6-to-2.0.md)).

## Behavior-sensitive notes

### Package `exports`

Only the package root is exported. If you imported internal files (for example `field-redactor/dist/objectRedactor`), switch to the public API from `field-redactor`.

### Deep imports of moved modules

Source files were reorganized under `api/`, `engine/`, `rules/`, etc. That affects only consumers who imported unpublished internal paths—not `import { FieldRedactor } from 'field-redactor'`.

## No action required (for 1.5 → 1.6)

- Existing `secretKeys` / `deepSecretKeys` / `opaqueSecretKeys` / `removeSecretKeys` configs (and, in 1.6 only, `fullSecretKeys` / `deleteSecretKeys`)
- `createSafe()`, builder, presets, `dryRun` / `dryRunSync`
- Copy-on-write and sync APIs from 1.5.0

## Links

- [Release notes v1.6.3](../release-notes/v1.6.3.md)
- [Release notes v1.6.2](../release-notes/v1.6.2.md)
- [Release notes v1.6.1](../release-notes/v1.6.1.md)
- [Release notes v1.6.0](../release-notes/v1.6.0.md)
- [CHANGELOG](../../CHANGELOG.md)
