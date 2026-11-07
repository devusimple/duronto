# Writing a schema

## Tables

```ts
table(name, columns, constraints?)
```

- `name`: SQL table name.
- `columns`: record of TypeScript field name → column builder.
- `constraints` (optional): callback receiving the columns object, returning table-level constraints.

SQL column names default to `snake_case` of the TS key. Override with `.name("custom")`.

## Column types

| Builder | TS type |
|---|---|
| `id()` | `number` (PK, auto) |
| `uuid()` | `string` |
| `text()` | `string` |
| `varchar(n)` | `string` |
| `int()` | `number` |
| `bigint()` | `bigint` |
| `real()` | `number` |
| `bool()` | `boolean` |
| `timestamp()` | `Date` |
| `json<T>()` | `T` |
| `enumType(["a","b"])` | `"a" | "b"` |

> Note: `enum` is a reserved word; the builder is exported as `enumType`.

## Modifiers

- `.notNull()` — `NOT NULL`, removes `null` from type.
- `.unique()` — `UNIQUE`.
- `.default(v)` — `DEFAULT v`, optional on insert.
- `.defaultNow()` — `DEFAULT CURRENT_TIMESTAMP`, optional on insert.
- `.primaryKey()` — `PRIMARY KEY`.
- `.index()` — creates an index.
- `.check(expr)` — `CHECK (...)`.
- `.name("x")` — custom SQL column name.
- `.renamedFrom("old")` — rename hint for diffing.
- `.noIndex()` — disable auto-index (for FK columns).

Columns are nullable by default.

## Relations

### `ref()`

```ts
ref(() => targetTable.column, { onDelete?, onUpdate? })
```

- Takes a thunk so tables can reference each other / themselves.
- The resulting column inherits the referenced column's type.
- Options: `"cascade" | "set null" | "restrict" | "no action"` (default `no action`).
- FK columns get an index by default (disable with `.noIndex()`).

### Self-reference

```ts
parentId: ref((): AnyColumn => category.id, { onDelete: "set null" }),
```

Requires the `(): AnyColumn =>` annotation.

### `junction()`

```ts
junction("post_tag", {
  post: () => post.id,
  tag: () => tag.id,
}, { onDelete: "cascade" });
```

Creates a join table with a composite primary key.

### Table-level constraints

```ts
table("order_item", {
  orderId: ref(() => order.id).notNull(),
  productId: ref(() => product.id).notNull(),
  qty: int().notNull(),
}, (t) => ({
  pk: primaryKey([t.orderId, t.productId]),
}));
```

Available: `primaryKey`, `unique`, `index`, `check`, `foreignKey`.

`foreignKey` accepts a single column or an array of columns for composite foreign keys.