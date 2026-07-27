# Examples

Copy-paste recipes for common Field Redactor setups. Run with:

```bash
npx ts-node examples/logging-metadata.ts
```

| File | Covers |
| --- | --- |
| [logging-metadata.ts](logging-metadata.ts) | Schema sibling-key redaction + auth key removal |
| [path-rules.ts](path-rules.ts) | Path patterns, modes, and pass keys |
| [value-patterns.ts](value-patterns.ts) | Value-pattern redaction regardless of key name |
| [dry-run.ts](dry-run.ts) | Preview redactions/deletes with attribution |
