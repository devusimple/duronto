---
title: Migrations
description: Snapshot-based schema diffing, migration generation, rename hints, and destructive-change controls.
---

duronto generates migrations by comparing the compiled schema to a stored snapshot. It does not introspect a live database.

## Artifacts

| Artifact | Purpose |
|---|---|
| Migration SQL (`migrations/*.sql`) | Dialect-rendered statements for schema changes |
| Snapshot metadata (for example `migrations/meta/latest.json`) | Serialized IR baseline for the next diff |

## Workflow

1. Compile the schema module to IR.
2. Load the previous snapshot/IR.
3. Compute `diff(old, new)` → operations (`createTable`, `addColumn`, `dropIndex`, `addForeignKey`, rename operations, etc.).
4. Render operations with the selected dialect.
5. `generate` writes migration SQL and updates the snapshot.

## Commands

```bash
npx duronto generate --name add_posts
npx duronto diff
npx duronto check
```

## Rename handling

Renames can appear as drop + add. duronto requires an explicit hint when the intent is to rename:

```ts
fullName: text().notNull().renamedFrom("name"),
```

Without `.renamedFrom(...)`, the diff may emit destructive drop/add operations and a data-loss warning. Use rename hints to preserve data intent.

## Destructive operations

`dropTable`, `dropColumn`, and narrowing type changes are treated as destructive. `duronto generate` refuses to emit them unless explicitly allowed:

```bash
npx duronto generate --name remove_legacy --allow-destructive
```

Review generated SQL and ensure backup/rollout procedures before applying destructive migrations.

## Dialect considerations

Some dialects have limited `ALTER TABLE` support. Dialect implementations emit equivalent sequences (for example, rebuild/copy/swap patterns) as needed. This behavior is dialect-specific, not schema-author logic.
