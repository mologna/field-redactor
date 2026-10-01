# Release notes index

## Publishing

npm versions use the same `vMAJOR.MINOR.PATCH` git tags (for example `v1.6.3`). Pushing a tag matching `^v[0-9]+\.[0-9]+\.[0-9]+$` runs [`.github/workflows/publish.yml`](../../.github/workflows/publish.yml) (build, test, `npm publish` via OIDC trusted publishing). Tags with a prerelease suffix (for example `v2.0.0-alpha.1`) do not publish. Configure a Trusted Publisher on npm for `mologna/field-redactor` with workflow filename `publish.yml` — see [CONTRIBUTING.md](../../CONTRIBUTING.md#publishing).

| Version | npm | Notes |
| --- | --- | --- |
| **v2.0.0** | After tag `v2.0.0` | [v2.0.0.md](v2.0.0.md) — major: Opaque/Remove-only, safe construction, export trim (`package.json` is `2.0.0`; publish on tag) |
| **v2.0.0-alpha.4** | No (prerelease; publish skipped) | [v2.0.0-alpha.4.md](v2.0.0-alpha.4.md) — housekeeping (test renames, migration/notes finalize) |
| **v2.0.0-alpha.3** | No (prerelease; publish skipped) | [v2.0.0-alpha.3.md](v2.0.0-alpha.3.md) — shrink `@internal` public type exports |
| **v2.0.0-alpha.2** | No (prerelease; publish skipped) | [v2.0.0-alpha.2.md](v2.0.0-alpha.2.md) — safe-by-default constructor (option A) |
| **v2.0.0-alpha.1** | No (prerelease; publish skipped) | [v2.0.0-alpha.1.md](v2.0.0-alpha.1.md) — Opaque/Remove-only naming; dry-run remove vocabulary |
| **v1.6.3** | Yes | [v1.6.3.md](v1.6.3.md) — examples, OIDC publish, legacy naming warnings |
| **v1.6.2** | Yes | [v1.6.2.md](v1.6.2.md) — canonical opaque/remove naming; drop ObjectRedactor façade |
| **v1.6.1** | Yes | [v1.6.1.md](v1.6.1.md) — internal simplification / layering cleanup |
| **v1.6.0** | Yes | [v1.6.0.md](v1.6.0.md) — path rules, passKeys, naming aliases, architecture |
| **v1.5.0** | Yes | [v1.5.0.md](v1.5.0.md) — DX polish, value patterns, unified traversal |
| v1.3.0 | No (superseded by 1.5.0) | [v1.3.0.md](v1.3.0.md) — sync API, COW, builder, dryRun, presets |
| v1.2.2 | No | [v1.2.2.md](v1.2.2.md) |
| v1.2.1 | No | [v1.2.1.md](v1.2.1.md) |
| v1.2.0 | Yes | [v1.2.0.md](v1.2.0.md) |
| v1.1.0 | Yes | [v1.1.0.md](v1.1.0.md) |
| v1.0.0 | Yes | [v1.0.0.md](v1.0.0.md) |

## Migration

- [1.6.x → 2.0](../guides/migration-1.6-to-2.0.md) — major upgrade to **2.0.0**
- [1.5.x → 1.6.x](../guides/migration-1.5-to-1.6.md) — path rules, naming aliases, package exports
- [1.2.x → 1.5.0](../guides/migration-1.2-to-1.5.md) — upgrade path from the previous npm line

## Internal milestones (removed)

> **Do not confuse with npm 2.0.0.** Files named `2.0.0.md` … `2.5.1.md` document **historical internal git tags** that were never published to npm and were folded into **v1.3.0** / **v1.5.0**. The npm major is tracked as **[v2.0.0.md](v2.0.0.md)** (and prereleases `v2.0.0-alpha.*`).

Git tags `2.0.0`–`2.5.1` tracked incremental development toward **v1.3.0** and **v1.5.0**. They were never published to npm and are removed from the repository. Their notes remain for archaeology:

| Tag | Notes |
| --- | --- |
| 2.4.0 | [2.4.0.md](2.4.0.md) — included in v1.5.0 |
| 2.5.0 | [2.5.0.md](2.5.0.md) — included in v1.5.0 |
| 2.5.1 | [2.5.1.md](2.5.1.md) — included in v1.5.0 |
| 2.0.0–2.3.1 | [2.0.0.md](2.0.0.md) … [2.3.1.md](2.3.1.md) — included in v1.3.0 / v1.5.0 |

Full history: [CHANGELOG.md](../../CHANGELOG.md).
