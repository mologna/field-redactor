# Contributing to field-redactor

This repository publishes the npm package **`field-redactor`**. The local folder may be named `obfuscator`; that is only a workspace path—use the package name in docs, issues, and imports.

## Versioning

| Channel | Meaning |
|---------|---------|
| npm `2.x` | Current major (`2.1.0` on this branch) |
| npm `1.x` | Previous public line (`1.6.x`) |
| Internal `2.x` tags / release notes | Historical development tags toward 1.3 / 1.5; **not** npm 2.0 (see [release-notes index](docs/release-notes/README.md#internal-milestones-removed)) |

Prefer npm version numbers in user-facing docs. Files named `docs/release-notes/2.0.0.md` … `2.5.1.md` are archaeology; the npm major is [v2.0.0.md](docs/release-notes/v2.0.0.md).

## Layout

```
src/
  api/       Public facade: FieldRedactor, ConfigBuilder, DI wiring
  engine/    Traversal (`ObjectRedactorTraversal`), array/custom-object handlers, PrimitiveRedactor
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

Order: **Schema → path rule → Opaque → Deep → Remove → Shallow → Value-pattern → default** (enclosing opaque/deep keys apply before the leaf key rule).

Traversal and dry-run attribution both use this module. When adding a rule type, update `RuleResolver` and add a contract case in `tests/unit/ruleResolver.contract.spec.ts`.

### Naming vocabulary

| Mode | Preferred config / enum | Notes |
|------|-------------------------|-------|
| Shallow | `secretKeys`, `CustomObjectMatchType.Shallow` | — |
| Deep | `deepSecretKeys` | — |
| Opaque | `opaqueSecretKeys`, `CustomObjectMatchType.Opaque`, `isOpaqueSecretKey` | `fullSecretKeys` / `Full` removed in 2.0 |
| Remove | `removeSecretKeys`, `CustomObjectMatchType.Remove`, `isRemoveSecretKey` | `deleteSecretKeys` / `Delete` removed in 2.0 |

Internally, `SecretManager` stores and matches on these field names only.

## Development

```bash
yarn install
yarn build
yarn test
```

- Unit tests: `tests/unit/`
- Integration / end-to-end: `tests/integration/` (keep these few and scenario-focused; prefer unit tests for rule edge cases)
- Shared test helpers: `tests/helpers/`
- Copy-paste recipes: `examples/`

## Publishing

CI runs on push/PR to `master` (`.github/workflows/ci.yml`).

Pushing a **release** tag matching `^v[0-9]+\.[0-9]+\.[0-9]+$` (for example `v1.6.3`) runs `.github/workflows/publish.yml`: build, test, then `npm publish` via **npm Trusted Publishing (OIDC)**. No `NPM_TOKEN` secret is required.

Prerelease-style tags such as `v2.0.0-alpha.1` still match the workflow’s broad `v*.*.*` filter but are **skipped** before publish, so they can be pushed without releasing to npm.

### One-time npm setup

1. Open [field-redactor](https://www.npmjs.com/package/field-redactor) → **Settings → Trusted Publisher**
2. Choose **GitHub Actions**
3. Set:
   - **Owner / repository:** `mologna/field-redactor`
   - **Workflow filename:** `publish.yml` (filename only — must match exactly, including `.yml`)
4. Save. After a successful OIDC publish, you can optionally restrict token-based publishing in **Publishing access**.

```bash
git tag -a v2.1.0 -m "v2.1.0"
git push origin v2.1.0
```

## Pull requests

- Keep changes focused; avoid drive-by refactors outside the task.
- Do not commit unless asked.
- Match existing commit message style (short, imperative, why-focused).
