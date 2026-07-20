# Contributing to field-redactor

This repository publishes the npm package **`field-redactor`**. The local folder may be named `obfuscator`; that is only a workspace path—use the package name in docs, issues, and imports.

## Versioning

| Channel | Meaning |
|---------|---------|
| npm `1.x` | Public releases (current line: `1.5.x`) |
| Internal `2.x` tags / release notes | Historical development tags; not the npm line of record |

Prefer npm version numbers in user-facing docs. Internal release notes under `docs/release-notes/` may still mention older `2.x` tags for chronology.

## Layout

```
src/
  api/       Public facade: FieldRedactor, ConfigBuilder, DI wiring
  engine/    Traversal, array/custom-object handlers, PrimitiveRedactor
  rules/     SecretManager, matchers, RuleResolver, CustomObjectManager
  dryrun/    Structural diff + rule attribution
  config/    Validation, presets, redactionRules, schema helpers
  util/      pathParsing, jsonWalk, maybeAsync, regexUtils
  index.ts   Public exports only
  types.ts   Shared types
  errors.ts  Public errors
```

Public consumers should import from `field-redactor` (see `package.json` `exports`). Do not rely on deep `dist/...` paths.

## Rule precedence

Single source of truth: **`RuleResolver`** (`src/rules/ruleResolver.ts`).

Order: **schema → path rule → enclosing opaque/deep key → leaf key rule → value pattern → default**.

Traversal and dry-run attribution both use this module. When adding a rule type, update `RuleResolver` and add a contract case in `tests/unit/ruleResolver.contract.spec.ts`.

### Naming vocabulary

| Mode | Preferred config / enum | Legacy aliases |
|------|-------------------------|----------------|
| Shallow | `secretKeys`, `CustomObjectMatchType.Shallow` | — |
| Deep | `deepSecretKeys` | — |
| Opaque | `opaqueSecretKeys`, `CustomObjectMatchType.Opaque` | `fullSecretKeys`, `Full` |
| Remove | `removeSecretKeys`, `CustomObjectMatchType.Remove` | `deleteSecretKeys`, `Delete` |

## Development

```bash
yarn install
yarn build
yarn test
```

- Unit tests: `tests/unit/`
- Integration / end-to-end: `tests/integration/` (keep these few and scenario-focused; prefer unit tests for rule edge cases)
- Shared test helpers: `tests/helpers/`

## Pull requests

- Keep changes focused; avoid drive-by refactors outside the task.
- Do not commit unless asked.
- Match existing commit message style (short, imperative, why-focused).
