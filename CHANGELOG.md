# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.5.0] - 2026-06-24

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

Development tag `2.5.0` adds value-pattern redaction on top of **2.4.0**. A future **v1.5.0** npm release will publish this content. See [docs/release-notes/README.md](docs/release-notes/README.md).

## [2.4.0] - 2026-06-24

### Added

- **`FieldRedactorConfigBuilder.usePreset()`** — merge preset or partial config into the builder; regex/schemas accumulate, scalars apply only when unset.
- **`dryRun` path rule attribution** — `report.pathRules` explains which rule (`schema`, `opaque`, `deep`, `remove`, `shallow`, `default`) caused each redacted or deleted path, with optional regex `pattern` and schema metadata.
- **Anti-patterns guide** — [docs/guides/anti-patterns.md](docs/guides/anti-patterns.md) for common configuration mistakes.
- **Exported types** — `DryRunPathRule`, `RedactionRuleLabel`, `MatchedSchemaReport`.
- **Release notes** — see [docs/release-notes/2.4.0.md](docs/release-notes/2.4.0.md).

### Internal milestones (`2.x` tags)

Development tag `2.4.0` tracks Phase 2 DX polish on top of **v1.3.0**. A future **v1.4.0** npm release will publish this content. See [docs/release-notes/README.md](docs/release-notes/README.md).

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

[2.5.0]: https://github.com/mologna/field-redactor/compare/2.4.0...2.5.0
[2.4.0]: https://github.com/mologna/field-redactor/compare/2.3.1...2.4.0
[1.3.0]: https://github.com/mologna/field-redactor/compare/v1.2.2...v1.3.0
[1.2.2]: https://github.com/mologna/field-redactor/compare/v1.2.1...v1.2.2
[1.2.1]: https://github.com/mologna/field-redactor/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/mologna/field-redactor/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/mologna/field-redactor/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/mologna/field-redactor/releases/tag/v1.0.0
