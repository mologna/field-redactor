# Value-pattern redaction

Opt-in redaction for scalar fields whose **value** matches a regex, regardless of key name. Use this when PII appears in free-text fields (`description`, `message`, `body`) that are not named like the data they contain.

Value-pattern rules are **lowest precedence**: they run only when Shallow, Deep, Opaque, Remove, and Schema rules leave the field unchanged.

## When to use

| Situation | Approach |
| --- | --- |
| Key name identifies sensitivity (`password`, `email`) | Shallow / Deep / Opaque / Remove |
| Sensitivity depends on a sibling (`{ name, value }`) | Schema |
| PII may appear in arbitrary string fields | **Value-pattern** (`valuePatterns`) |

## Configuration

```typescript
import { FieldRedactor, FieldRedactorConfigBuilder } from 'field-redactor';

const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

// Plain config — valuePatterns-only is valid with createSafe()
const redactor = FieldRedactor.createSafe({
  valuePatterns: [emailPattern]
});

// Builder
const built = FieldRedactorConfigBuilder.create()
  .valuePattern(emailPattern, /\b\d{3}-\d{2}-\d{4}\b/) // SSN-shaped values
  .shallow(/password/i) // key rules still apply
  .buildSafeRedactor();
```

## Behavior

- Matches **strings** and **numbers** (tested via `String(value)`). Booleans, `null`, and `undefined` are skipped.
- Does not run inside Deep or Opaque subtrees that already redact all primitives.
- Combine with key rules for defense in depth: key names catch structured fields; value patterns catch embedded PII in free text.

```typescript
const input = {
  email: 'alice@example.com', // shallow key rule
  description: 'Email alice@example.com' // value pattern
};

const { report } = redactor.dryRunSync(input);
// pathRules → shallow on `email`, value on `description`
```

## dryRun attribution

Redactions from value patterns appear in `report.pathRules` with `rule: 'value'` and the matching regex in `pattern`.

## Related

- [Secret key modes](secret-key-modes.md) — key-name rules
- [Anti-patterns](anti-patterns.md) — do not confuse key rules with value detection
- [Configuration reference](../reference/config.md)
