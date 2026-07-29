# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0-alpha.2] - 2026-07-29

Prerelease: safe-by-default construction (option A). Not published to npm. See [docs/release-notes/v2.0.0-alpha.2.md](docs/release-notes/v2.0.0-alpha.2.md).

### Changed

- `new FieldRedactor()` / empty config throws `FieldRedactorConfigurationError` (same explicit-rule bar as `createSafe`).
- `createSafe` is a thin alias of the constructor; `buildSafeRedactor()` aliases `buildRedactor()`.
- Removed the “All values will be redacted…” empty-config warning path.

### Not yet in this alpha

- Dropping `@internal` root type exports.

## [2.0.0-alpha.1] - 2026-07-28

First prerelease toward npm **2.0.0**: Opaque/Remove-only naming and dry-run Remove vocabulary. Not published to npm (prerelease tags are skipped by the publish workflow). See [docs/release-notes/v2.0.0-alpha.1.md](docs/release-notes/v2.0.0-alpha.1.md) and [docs/plans/2.0.md](docs/plans/2.0.md).

### Removed

- Config aliases `fullSecretKeys` / `deleteSecretKeys` (use `opaqueSecretKeys` / `removeSecretKeys`; legacy keys throw at validation).
- `CustomObjectMatchType.Full` / `.Delete` (use `.Opaque` / `.Remove`).
- Builder `.delete()` (use `.remove()`).

### Changed

- Dry-run: `deletedPaths` → `removedPaths`; `pathRules[].action` `'delete'` → `'remove'`.
- Publish workflow only publishes tags matching `^v[0-9]+\.[0-9]+\.[0-9]+$` (prerelease tags such as `v2.0.0-alpha.1` are skipped).

### Not yet in this alpha

- Constructor requiring explicit rules (option A) — landed in **2.0.0-alpha.2**.
- Dropping `@internal` root type exports.

## [1.6.3] - 2026-07-27

DX and release-hygiene patch: examples, legacy naming warnings, OIDC publish workflow, and test cleanup. See [docs/release-notes/v1.6.3.md](docs/release-notes/v1.6.3.md).

### Added

- **Examples** — [examples/](examples/) recipes for logging metadata, path rules, value patterns, and dry-run.
- **Publish workflow** — tag-triggered `.github/workflows/publish.yml` using npm Trusted Publishing (OIDC).
- **Legacy naming warnings** — constructing with `fullSecretKeys` / `deleteSecretKeys` emits deprecation warnings (behavior unchanged).

### Changed

- `createSafe` error text prefers Opaque/Remove field names.
- Incidental JSON/engine types marked `@internal` in JSDoc (still exported).
- Slimmed overlapping dry-run attribution tests; contract suite remains the SSOT.

## [1.6.2] - 2026-07-22

Canonical Opaque/Remove naming internally and removal of the thin `ObjectRedactor` orchestrator. See [docs/release-notes/v1.6.2.md](docs/release-notes/v1.6.2.md).

### Changed

- **Canonical naming** — config normalize, builder, presets, and `SecretManager` store/match on `opaqueSecretKeys` / `removeSecretKeys`; methods are `isOpaqueSecretKey` / `isRemoveSecretKey`. Legacy `fullSecretKeys` / `deleteSecretKeys` remain accepted input aliases.
- **Traversal wiring** — `FieldRedactor` depends on `ObjectRedactorTraversal` directly (no `ObjectRedactor` façade).
- **Builder** — `buildRedactor()` / `buildSafeRedactor()` use a static `FieldRedactor` import (no lazy `require()`).

### Removed

- Internal `ObjectRedactor` class (never part of the public export surface).

## [1.6.1] - 2026-07-22

Internal simplification and layering cleanup with no intended public API changes for typical consumers. See [docs/release-notes/v1.6.1.md](docs/release-notes/v1.6.1.md).

### Changed

- Unified custom-object field handling into a single `handleField` path and one match-type dispatcher.
- Sibling-key and primitive coercion helpers moved out of the engine layer (`schemaSiblingKey`, `primitiveCoercion`) so rules no longer import engine.
- Config construction normalizes aliases once; `resolveSecretKeys` assumes already-normalized input.
- Path-rule disposition uses a mode map; identical force-deep helpers merged into `forceDeepForKey`.
- Dry-run attribution builds `RuleResolver` directly (removed unused attribution shim).

### Removed

- Dead internal re-exports (`fieldDisposition`, unused dry-run attribution wrappers, `awaitMaybe`).
- Unused public convenience alias `FieldRedactor.fromConfig()` (equivalent to `new FieldRedactor(config)`).

## [1.6.0] - 2026-07-21

Path rules, pass-key allowlists, Opaque/Remove naming aliases, and architecture cleanup. See [docs/release-notes/v1.6.0.md](docs/release-notes/v1.6.0.md) and [docs/guides/migration-1.5-to-1.6.md](docs/guides/migration-1.5-to-1.6.md).

### Added

- **`pathRules` / `.pathRule()`** — path-based redaction modes (`shallow`, `deep`, `opaque`, `remove`, `pass`) with `*` wildcards.
- **`passKeys` / `.passKey()`** — allowlisted keys preserved under deep parents.
- **Naming aliases** — `opaqueSecretKeys`, `removeSecretKeys`, `CustomObjectMatchType.Opaque` / `Remove` (legacy `full`/`delete` names retained).
- **`RedactionMode`**, **`PathRule`**, **`PathRuleMode`** exports.
- **`RuleResolver`** — shared precedence for traversal and dry-run attribution.
- **Path rules guide** — [docs/guides/path-rules.md](docs/guides/path-rules.md).
- **Migration guide** — [docs/guides/migration-1.5-to-1.6.md](docs/guides/migration-1.5-to-1.6.md).
- **Contributing guide** — [CONTRIBUTING.md](CONTRIBUTING.md).

### Changed

- Source layout under `api/`, `engine/`, `rules/`, `dryrun/`, `config/`, `util/`.
- Unified sync/async traversal behind `MaybeAsync` helpers.
- `package.json` `"exports"` limited to the package root (`.`).
- Internal sync-traversal alias removed (`ObjectRedactorSyncTraversal`).

## [1.5.0] - 2026-06-24

Published npm release bundling **v1.2.1**–**v1.3.0** git work and former internal milestones **2.4.0**–**2.5.1**. See [docs/guides/migration-1.2-to-1.5.md](docs/guides/migration-1.2-to-1.5.md) when upgrading from npm **1.2.x**.

### Added

- **`FieldRedactorConfigBuilder.usePreset()`** — merge preset or partial config into the builder; regex/schemas accumulate, scalars apply only when unset.
- **`dryRun` path rule attribution** — `report.pathRules` explains which rule (`schema`, `opaque`, `deep`, `remove`, `shallow`, `value`, `default`) caused each redacted or deleted path, with optional regex `pattern` and schema metadata.
- **Value-pattern redaction** — opt-in `valuePatterns` redacts scalars when their string form matches a regex, regardless of key name; lowest precedence after key and schema rules.
- **`FieldRedactorConfigBuilder.valuePattern()`** — fluent builder support for value patterns.
- **Anti-patterns guide** — [docs/guides/anti-patterns.md](docs/guides/anti-patterns.md).
- **Value-pattern guide** — [docs/guides/value-pattern-redaction.md](docs/guides/value-pattern-redaction.md).
- **Migration guide** — [docs/guides/migration-1.2-to-1.5.md](docs/guides/migration-1.2-to-1.5.md).
- **Exported types** — `DryRunPathRule`, `RedactionRuleLabel`, `MatchedSchemaReport`.
- **Release notes** — see [docs/release-notes/v1.5.0.md](docs/release-notes/v1.5.0.md).

### Changed

- **Unified JSON traversal** — `ObjectRedactorTraversal` handles sync in-place, copy-on-write, and async in-place redaction via a shared `ContainerMutation` adapter.
- **Shared custom-object handlers** — match-type dispatch consolidated in `objectRedactorCustomObject.ts`.
- Config validator duplicate-regex warnings apply across key-rule fields only (not between `secretKeys` and `valuePatterns`).
- Internal refactor: `fieldRedactorDeps`, `regexUtils`, dry-run attribution resolvers, shared test helpers.
- Git tags `2.0.0`–`2.5.1` removed; development milestones are consolidated under this release.

### Fixed

- Async in-place redaction uses the same traversal adapter as sync, aligning nested object and array behavior across modes.

## [2.5.1] - 2026-06-24 (internal milestone — included in 1.5.0)

### Changed

- **Unified JSON traversal** — `ObjectRedactorTraversal` handles sync in-place, copy-on-write, and async in-place redaction via a shared `ContainerMutation` adapter; `ObjectRedactor` is now a thin orchestrator.
- **Shared custom-object handlers** — match-type dispatch consolidated in `objectRedactorCustomObject.ts` for sync and async paths.
- **Release notes** — see [docs/release-notes/2.5.1.md](docs/release-notes/2.5.1.md).

### Fixed

- Async in-place redaction uses the same traversal adapter as sync, aligning nested object and array behavior across modes.

## [2.5.0] - 2026-06-24 (internal milestone — included in 1.5.0)

### Added

- **Value-pattern redaction** — opt-in `valuePatterns` redacts scalars when their string form matches a regex, regardless of key name; lowest precedence after key and schema rules.
- **`FieldRedactorConfigBuilder.valuePattern()`** — fluent builder support for value patterns.
- **`dryRun` value attribution** — `report.pathRules` includes `rule: 'value'` with the matching pattern.
- **Value-pattern guide** — [docs/guides/value-pattern-redaction.md](docs/guides/value-pattern-redaction.md).
- **Release notes** — see [docs/release-notes/2.5.0.md](docs/release-notes/2.5.0.md).

### Changed

- Config validator duplicate-regex warnings apply across key-rule fields only (not between `secretKeys` and `valuePatterns`, which match different targets).
- Internal refactor: `fieldRedactorDeps`, `regexUtils`, dry-run attribution resolvers, shared test helpers.

### Internal milestones (`2.x` tags)

Superseded by **v1.5.0** npm release. See [docs/release-notes/v1.5.0.md](docs/release-notes/v1.5.0.md).

## [2.4.0] - 2026-06-24 (internal milestone — included in 1.5.0)

### Added

- **`FieldRedactorConfigBuilder.usePreset()`** — merge preset or partial config into the builder; regex/schemas accumulate, scalars apply only when unset.
- **`dryRun` path rule attribution** — `report.pathRules` explains which rule (`schema`, `opaque`, `deep`, `remove`, `shallow`, `default`) caused each redacted or deleted path, with optional regex `pattern` and schema metadata.
- **Anti-patterns guide** — [docs/guides/anti-patterns.md](docs/guides/anti-patterns.md) for common configuration mistakes.
- **Exported types** — `DryRunPathRule`, `RedactionRuleLabel`, `MatchedSchemaReport`.
- **Release notes** — see [docs/release-notes/2.4.0.md](docs/release-notes/2.4.0.md).

### Internal milestones (`2.x` tags)

Superseded by **v1.5.0** npm release. See [docs/release-notes/v1.5.0.md](docs/release-notes/v1.5.0.md).

## [1.3.0] - 2026-06-24

### Added

- **Sync redaction API** — `redactSync()`, `redactInPlaceSync()`, and `syncRedactor` config option for redaction without per-field `Promise` overhead.
- **Copy-on-write redaction** — `redact()` and `redactSync()` use structural sharing by default (`cloneInput: true`); only mutated branches are cloned. Set `cloneInput: false` to mutate in place.
- **`FieldRedactor.createSafe()`** — factory that requires at least one explicit redaction rule and throws `FieldRedactorConfigurationError` otherwise.
- **`FieldRedactorConfigBuilder`** — fluent builder mapping doc labels (Shallow, Deep, Opaque, Remove, Schema) to config fields; `build()`, `buildRedactor()`, and `buildSafeRedactor()`.
- **`dryRun()` / `dryRunSync()`** — redact a snapshot and return `{ result, report }` with `redactedPaths`, `deletedPaths`, and `matchedSchemas` (optional `schemaName` when schemas are named via the builder).
- **Configuration validation** — `validateFieldRedactorConfig()`, `hasExplicitRedactionRules()`, `configWarnings` on instances, `strict` and `onConfigWarning` options.
- **Presets** — `presets.loggingMetadata()`, `presets.applicationLogging()`, and `presets.keyValueEntries()` derived from integration test fixtures.
- **Documentation** — split into `docs/guides/` (secret key modes, metadata redaction) and `docs/reference/config.md`; README quickstart and decision guide.
- **Release notes** — see [docs/release-notes/v1.3.0.md](docs/release-notes/v1.3.0.md).

### Internal milestones (`2.x` tags)

Development tags `2.0.0`–`2.3.1` track incremental work toward `1.3.0`. See [docs/release-notes/README.md](docs/release-notes/README.md).

### Changed

- Default `redact()` / `redactSync()` behavior now uses copy-on-write instead of a full deep clone of the input. The input is still not mutated unless `cloneInput: false`.
- Documentation and JSDoc adopt conceptual labels (Shallow, Deep, Opaque, Remove, Schema) alongside existing config field names.

### Fixed

- Internal sync and copy-on-write traversal unified behind a shared `ContainerMutation` layer (correctness and maintainability).

## [1.2.2] - 2026-06-24

### Added

- Export `FieldRedactorError` and `FieldRedactorConfigurationError` from the public API.

### Changed

- Replace heavy `any` usage with explicit JSON and redaction types (`JsonValue`, `RedactableInput`, generic `redact<T>()`, etc.).

## [1.2.1] - 2026-06-24

### Changed

- Relax custom object schema matching: objects match when they contain every schema key; extra keys on the input are allowed.

### Fixed

- Sibling-key custom object redaction for falsy values (`""`, `0`, `false`) when the sibling key is present.
- `ignoreBooleans` default documented to match code (`false` — booleans are redacted by default).

## [1.2.0] - 2025-02-10

### Added

- **`deleteSecretKeys`** — Remove matching keys from output entirely.

## [1.1.0] - 2025-01-30

### Changed

- Primitives, `null`, `undefined`, `Date`, and functions at the root are returned unchanged instead of throwing.

## [1.0.0] - 2025-01-24

### Added

- Initial public release: regex key rules, custom object schemas with sibling-key indirection, async `redact()` / `redactInPlace()`, and configurable redactor functions.

[2.0.0-alpha.2]: https://github.com/mologna/field-redactor/compare/v2.0.0-alpha.1...v2.0.0-alpha.2
[2.0.0-alpha.1]: https://github.com/mologna/field-redactor/compare/v1.6.3...v2.0.0-alpha.1
[1.6.3]: https://github.com/mologna/field-redactor/compare/v1.6.2...v1.6.3
[1.6.2]: https://github.com/mologna/field-redactor/compare/v1.6.1...v1.6.2
[1.6.1]: https://github.com/mologna/field-redactor/compare/v1.6.0...v1.6.1
[1.6.0]: https://github.com/mologna/field-redactor/compare/v1.5.0...v1.6.0
[1.5.0]: https://github.com/mologna/field-redactor/releases/tag/v1.5.0
[2.5.1]: https://github.com/mologna/field-redactor/compare/2.5.0...2.5.1
[2.5.0]: https://github.com/mologna/field-redactor/compare/2.4.0...2.5.0
[2.4.0]: https://github.com/mologna/field-redactor/compare/2.3.1...2.4.0
[1.3.0]: https://github.com/mologna/field-redactor/compare/v1.2.2...v1.3.0
[1.2.2]: https://github.com/mologna/field-redactor/compare/v1.2.1...v1.2.2
[1.2.1]: https://github.com/mologna/field-redactor/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/mologna/field-redactor/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/mologna/field-redactor/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/mologna/field-redactor/releases/tag/v1.0.0
