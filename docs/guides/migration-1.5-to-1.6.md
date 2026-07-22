# Migration: npm 1.5.x → 1.6.x

**1.6.0** is a minor release: new features and aliases with no required config changes for typical upgrades from **1.5.0**. **1.6.1** is an internal cleanup patch (install only; see [v1.6.1 release notes](../release-notes/v1.6.1.md)).

## Install

```bash
npm install field-redactor@1.6.1
# or
yarn add field-redactor@1.6.1
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

| Prefer | Legacy (still works) |
| --- | --- |
| `opaqueSecretKeys` | `fullSecretKeys` |
| `removeSecretKeys` | `deleteSecretKeys` |
| `CustomObjectMatchType.Opaque` | `CustomObjectMatchType.Full` |
| `CustomObjectMatchType.Remove` | `CustomObjectMatchType.Delete` |

Builder methods `.opaque()` / `.remove()` were already the preferred labels in 1.5.0.

## Behavior-sensitive notes

### Package `exports`

Only the package root is exported. If you imported internal files (for example `field-redactor/dist/objectRedactor`), switch to the public API from `field-redactor`.

### Deep imports of moved modules

Source files were reorganized under `api/`, `engine/`, `rules/`, etc. That affects only consumers who imported unpublished internal paths—not `import { FieldRedactor } from 'field-redactor'`.

## No action required

- Existing `secretKeys` / `deepSecretKeys` / `fullSecretKeys` / `deleteSecretKeys` configs
- `createSafe()`, builder, presets, `dryRun` / `dryRunSync`
- Copy-on-write and sync APIs from 1.5.0

## Links

- [Release notes v1.6.1](../release-notes/v1.6.1.md)
- [Release notes v1.6.0](../release-notes/v1.6.0.md)
- [CHANGELOG](../../CHANGELOG.md)
