# Migrations

## Flow

1. `generate` compiles the current schema to IR.
2. Loads the last snapshot from `./migrations/meta/latest.json`.
3. `diff(old, new)` returns operations.
4. Dialect turns operations into SQL, written to `./migrations/0001_<name>.sql`.
5. New snapshot replaces `latest.json`.

## Renames

A rename looks like drop + add. Declare it explicitly:

```ts
name: text().notNull().renamedFrom("full_name"),
```

Without the hint, diff emits `dropColumn` + `addColumn` and prints a warning: "possible data loss".

## Destructive changes

`dropTable`, `dropColumn`, and narrowing type changes are flagged as destructive. The CLI refuses to write them unless `--allow-destructive` is passed, and prints the exact SQL it would run.

## Commands

```bash
npx duronto generate --name init
npx duronto diff
npx duronto check
```