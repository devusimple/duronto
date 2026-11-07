---
title: Intermediate representation and dialects
description: The dialect-neutral IR used for SQL generation, snapshots, and diffs, and the dialect interface.
---

duronto compiles schema definitions to an **Intermediate Representation (IR)**: a JSON-serializable, deterministic model of the schema. The IR is the input to SQL renderers and snapshot diffing.

## Properties

- **Dialect-neutral** — logical types (for example `id`, `text`, `timestamp`, `json`) rather than engine-specific SQL types.
- **SQL-named** — identifiers reflect resolved SQL names (after naming rules/overrides).
- **Deterministic** — stable ordering supports clean source-control diffs.
- **Versioned** — includes a `version` field for format evolution.

## Conceptual structure

```json
{
  "version": 1,
  "tables": {
    "post": {
      "name": "post",
      "columns": {
        "id": { "type": "id", "notNull": true, "primaryKey": true },
        "author_id": {
          "type": "int",
          "notNull": true,
          "references": { "table": "user", "column": "id", "onDelete": "cascade", "onUpdate": "no action" }
        }
      },
      "primaryKey": ["id"],
      "indexes": [],
      "uniques": [],
      "checks": [],
      "foreignKeys": []
    }
  }
}
```

The exact field set is defined by IR types in the codebase; the example illustrates the shape.

## Dialect interface

```ts
interface Dialect {
  name: string;
  columnType(col: IRColumn): string;
  createTable(table: IRTable): string[];
  alterOps(ops: DiffOp[]): string[];
  quote(identifier: string): string;
}
```

Dialects map logical types to native SQL, render `CREATE`/alter statements, and quote identifiers. Dialect-specific workarounds (such as SQLite `ALTER TABLE` limitations) belong in the dialect implementation.

## Supported dialects

| Dialect | Notes |
|---|---|
| `sqlite` | Handles SQLite `ALTER TABLE` limitations in diff rendering. |
| `postgres` | Maps logical types to PostgreSQL-native types. |
