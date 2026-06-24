# Path rules and allowlists

Use **path rules** when sensitivity lives at a stable JSON location rather than a reusable key name. Use **passKeys** (or a `pass` path rule) to keep specific fields visible inside a deep-redacted subtree.

## Path rules

Path patterns use `.` between object keys, `[index]` for array positions, and `*` as a single-segment wildcard.

```typescript
import { FieldRedactorConfigBuilder } from 'field-redactor';

const redactor = FieldRedactorConfigBuilder.create()
  .pathRule('metadata.*.value', 'shallow')
  .pathRule('session.token', 'remove')
  .buildSafeRedactor();
```

| Mode | Effect at matched path |
| --- | --- |
| `shallow` | Redact scalar values (or recurse into objects/arrays) |
| `deep` | Redact all descendant primitives |
| `opaque` | Stringify and redact the value |
| `remove` | Delete the field |
| `pass` | Leave the field and subtree unchanged |

Path rules take precedence over key-regex rules but not over schema (`customObjects`) matches.

## Allowlist keys (`passKeys`)

When a parent is deep-redacted, matching key names are preserved:

```typescript
FieldRedactor.createSafe({
  deepSecretKeys: [/accountInfo/],
  passKeys: [/^id$/, /^externalId$/]
});
```

Equivalent path-rule form for a single field:

```typescript
.pathRule('accountInfo.id', 'pass')
```

## dryRun attribution

`report.pathRules` includes path-based matches with `pattern` set to the configured path expression (for example `metadata.*.value`).
