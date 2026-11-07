# IR (Intermediate Representation)

The IR is plain JSON, dialect-neutral, deterministic (sorted keys). It is the single source of truth for everything downstream.

```json
{
  "version": 1,
  "tables": {
    "post": {
      "columns": {
        "id":        { "type": "id", "notNull": true, "primaryKey": true },
        "title":     { "type": "text", "notNull": true },
        "author_id": { "type": "int", "notNull": true,
                       "references": { "table": "user", "column": "id", "onDelete": "cascade" } }
      },
      "indexes": [{ "name": "post_author_id_idx", "columns": ["author_id"], "unique": false }],
      "primaryKey": ["id"],
      "uniques": [],
      "checks": [],
      "foreignKeys": []
    }
  }
}
```

- Uses SQL names (snake_case), not TS field names.
- Logical types only (`"timestamp"`, not `TIMESTAMPTZ`).
- Always includes a `version`.

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

Adding a dialect = adding a new folder in `packages/dialects/` (or `src/dialects/`) implementing this interface. No other package changes.