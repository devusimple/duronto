---
title: Schema definition
description: Reference for table constructors, column types, modifiers, foreign keys, junction tables, and table-level constraints.
---

## Tables

```ts
import { table } from "duronto";

export const user = table("user", columns, constraints?);
```

- **`name`** — SQL table identifier.
- **`columns`** — object mapping TypeScript field names to column builders.
- **`constraints`** — optional callback `(t) => ({ ... })` for table-level constraints.

The TypeScript field name is the schema field name. The SQL column name is derived from the configured naming strategy (default `snake_case`) unless overridden with `.name(...)`.

Tables are exposed with their column properties for reference expressions such as `ref(() => user.id)`.

## Column types

| Builder | Inferred TypeScript type | Description |
|---|---|---|
| `id()` | `number` | Integer primary key; marked as auto/defaulted |
| `uuid()` | `string` | UUID logical type |
| `text()` | `string` | Text |
| `varchar(n)` | `string` | Variable-length text with length metadata |
| `int()` | `number` | Integer |
| `bigint()` | `bigint` | Big integer |
| `real()` | `number` | Floating/real numeric type |
| `bool()` | `boolean` | Boolean |
| `timestamp()` | `Date` | Timestamp/date-time logical type |
| `json<T>()` | `T` | JSON logical type |
| `enumType(values)` | union of `values` | Enumerated string values |

`enum` is a JavaScript/TypeScript reserved word; use `enumType`. Prefer `as const` for value arrays when authoring schemas in TypeScript.

Logical column types are dialect-neutral. Each dialect maps them to native SQL types.

## Modifiers

Columns are **nullable by default** unless modified.

| Modifier | SQL effect | Inference effect |
|---|---|---|
| `.notNull()` | `NOT NULL` | excludes `null` from the column type |
| `.unique()` | `UNIQUE` | none |
| `.default(value)` | `DEFAULT ...` | treated as optional on insert |
| `.defaultNow()` | current-timestamp default | treated as optional on insert |
| `.primaryKey()` | `PRIMARY KEY` | marks primary key / not null |
| `.index()` | creates an index | none |
| `.noIndex()` | suppresses automatic FK index | none |
| `.check(expr)` | `CHECK (...)` | none |
| `.name(sqlName)` | overrides SQL column name | none |
| `.renamedFrom(oldName)` | migration rename hint | none |

Column builders are immutable: modifiers return a new column value with updated metadata/type parameters.

## Foreign keys

`ref()` defines a schema-level foreign key and inherits the referenced column’s data type.

```ts
import { table, id, text, ref } from "duronto";

export const post = table("post", {
  id: id(),
  authorId: ref(() => user.id, { onDelete: "cascade" }).notNull(),
  title: text().notNull(),
});
```

Signature:

```ts
ref(() => targetTable.column, {
  onDelete?: "cascade" | "set null" | "restrict" | "no action",
  onUpdate?: "cascade" | "set null" | "restrict" | "no action",
})
```

- The target is provided as a **thunk** to support declaration order and self-references.
- Referential actions default to `"no action"`.
- Foreign key columns are indexed by default unless `.noIndex()` is applied.

### Self-references

TypeScript cannot always infer a self-referential type. Use an explicit annotation:

```ts
import type { AnyColumn } from "duronto";

export const category = table("category", {
  id: id(),
  parentId: ref((): AnyColumn => category.id, { onDelete: "set null" }),
});
```

## Junction tables

`junction()` defines a two-column join table with a composite primary key.

```ts
import { junction } from "duronto";

export const postTag = junction("post_tag", {
  post: () => post.id,
  tag: () => tag.id,
}, { onDelete: "cascade" });
```

For join tables that require additional columns or custom constraints, define a regular `table()` with `ref()` columns and a composite primary key.

## Table-level constraints

```ts
import { table, int, ref, primaryKey, unique, index, check, foreignKey } from "duronto";

export const orderItem = table("order_item", {
  orderId: ref(() => order.id).notNull(),
  productId: ref(() => product.id).notNull(),
  qty: int().notNull(),
}, (t) => ({
  pk: primaryKey([t.orderId, t.productId]),
  qtyCheck: check(`qty > 0`),
}));
```

| Constraint | Purpose |
|---|---|
| `primaryKey(cols)` | Composite or explicit primary key |
| `unique(cols)` | Uniqueness constraint |
| `index(cols, opts?)` | Secondary index |
| `check(expr)` | Table-level check expression |
| `foreignKey(cols, () => targetCols, opts?)` | Explicit foreign key (supports composite keys) |
