# Configuration anti-patterns

Common mistakes when configuring Field Redactor — and what to do instead. Many of these are also surfaced as `configWarnings` at construction time; set `strict: true` to fail fast in tests.

## Using `new FieldRedactor()` without rules

**Problem:** With no `secretKeys`, `deepSecretKeys`, `fullSecretKeys`, `deleteSecretKeys`, or `customObjects`, every value is redacted. Easy to ship a config that wipes entire payloads.

**Instead:** Use `FieldRedactor.createSafe()`, `FieldRedactorConfigBuilder.buildSafeRedactor()`, or the builder with at least one explicit rule.

```typescript
// Avoid
const redactor = new FieldRedactor();

// Prefer
const redactor = FieldRedactor.createSafe({ secretKeys: [/email/i] });
```

## Same regex in multiple key groups

**Problem:** `/email/i` in both `secretKeys` and `deepSecretKeys` is confusing — only the higher-precedence group applies (Opaque → Deep → Remove → Shallow).

**Instead:** Pick one mode per pattern. Use `dryRun()` and inspect `report.pathRules` to confirm which rule fired.

```typescript
const { report } = redactor.dryRunSync(sample);
// report.pathRules → [{ path: 'email', action: 'redact', rule: 'shallow', pattern: '/email/i' }]
```

## Global (`g`) regex flags

**Problem:** Global regexes can leave `lastIndex` set and make repeated `.test()` calls unreliable.

**Instead:** Remove the `g` flag from config patterns.

```typescript
// Avoid
secretKeys: [/email/gi]

// Prefer
secretKeys: [/email/i]
```

## Overlapping schemas

**Problem:** Two `customObjects` where one schema’s keys are a subset of another’s can both match the same object. Only the schema with **more keys** wins.

**Instead:** Make schemas disjoint, or order specificity by adding distinguishing keys to the more specific schema.

## Identical schema key sets

**Problem:** Two schemas with the exact same keys throw `FieldRedactorConfigurationError` at construction.

**Instead:** Merge into one schema or differentiate the key sets.

## Schema sibling reference typos

**Problem:** `value: 'name'` in a schema requires a `name` key on the schema object. A typo references a sibling that is not part of the schema definition.

**Instead:** Ensure every string sibling reference appears as a key on the schema. The validator warns when it does not.

## Relying on schemas when keys are stable

**Problem:** `customObjects` add complexity. If field names alone identify sensitive data (`password`, `ssn`), schemas are unnecessary.

**Instead:** Use Shallow / Deep / Opaque / Remove on key names. Reserve schemas for sibling-key patterns like `{ name, value }`.

## Expecting value-based detection

**Problem:** `secretKeys: [/email/]` matches **key names**, not values. A field named `description` containing `alice@example.com` is not redacted.

**Instead:** Add a schema when sensitivity depends on a sibling, or add explicit keys. Value-pattern redaction is not built in.

## Ignoring `dryRun` before production

**Problem:** Guessing which paths change on real log shapes.

**Instead:** Run `dryRunSync()` on representative payloads and review `redactedPaths`, `deletedPaths`, `matchedSchemas`, and `pathRules`.

```typescript
FieldRedactorConfigBuilder.create()
  .usePreset(presets.applicationLogging())
  .shallow(/ssn/i)
  .buildSafeRedactor()
  .dryRunSync(productionSample);
```

## Mutating shared references unintentionally

**Problem:** With `cloneInput: false`, `redact()` mutates the input. Shared object references elsewhere in the process may change.

**Instead:** Keep the default `cloneInput: true` (copy-on-write) unless you intentionally own the input object.

## Related guides

- [Secret key modes](secret-key-modes.md)
- [Metadata redaction](metadata-redaction.md)
- [Configuration reference](../reference/config.md)
