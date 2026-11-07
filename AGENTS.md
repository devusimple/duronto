# AGENTS.md

Guide for AI coding agents and contributors working on this project.
Working name: **duronto** (placeholder, rename freely).

---

## 1. What this project is

A **development-time-only** tool for designing database schemas in TypeScript and converting them to SQL.

- Write a schema in a very simple, strictly typed TypeScript API.
- The CLI turns it into SQL (`CREATE TABLE`, `ALTER TABLE`, ...) and TypeScript types.
- The tool is a `devDependency`. **Nothing from this package ships in the production bundle.**

Think "Drizzle's schema + drizzle-kit, minus the runtime query layer".

### Core principles (in priority order)

1. **Easiest possible schema design.** If an API choice makes schemas longer or harder to read, it is wrong.
2. **Strict type safety.** Types are inferred from the schema. No `any`, no manual type duplication.
3. **Zero runtime footprint.** Users must never `import` this package in app code (see section 3).
4. **Lightweight.** Few dependencies, small install size, fast CLI startup.
5. **Scalable.** Works for 5 tables or 500. Adding a SQL dialect must not require touching core.

### Non-goals (do NOT add these without an explicit decision)

- A runtime ORM, query builder, connection pool, or driver wrapper.
- Lazy loading or "eager load relations at query time".
- Automatic data migrations or seeding.
- Support for every database. Start with one dialect.

---

## 2. Mental model

```
schema.ts  ──(load)──>  Schema objects  ──(compile)──>  IR (JSON)  ──(dialect)──>  SQL
                              │                                │
                              └── type inference (.d.ts)       └── snapshot (for diffing)
```

- **Schema objects**: builder instances created by the user's schema file.
- **IR (Intermediate Representation)**: a plain, JSON-serializable description of the database. The single source of truth for everything downstream.
- **Dialect**: a pure function `IR -> SQL string`. No dialect logic leaks into core.
- **Snapshot**: a saved copy of the IR. Migrations are the diff between two snapshots.

---

## 3. The "dev-only" rule

This is the project's defining constraint. Agents must protect it.

- Package is installed with `npm i -D duronto`.
- User app code **never** imports it at runtime. Types are the only thing the app consumes, and those come from **generated files** (`schema.gen.d.ts` / `types.gen.ts`) or from `import type`.
- All builder code runs only inside the CLI process.
- Rule for contributors: no package in `dependencies` that is needed only by the app at runtime. The tool's own CLI dependencies go in `dependencies` of the tool itself (that is fine, they are never in the user's production build), but keep them minimal.
- Public type helpers must be importable via `import type { ... }` so they are erased at compile time.

Example of correct usage in an app:

```ts
import type { InferSelect, InferInsert } from "duronto"; // erased at build
import { user } from "./db/schema";                           // only for types

type User = InferSelect<typeof user>;
type NewUser = InferInsert<typeof user>;
```

> Note: the app may still import `./db/schema` in a type position only. Use `import type` or `typeof` so the schema file (and this package) is erased from the runtime bundle.

---

## 4. Repository layout

```
packages/
  core/          # column/table builders, type inference, IR types
  compiler/      # Schema objects -> IR, validation
  dialects/
    sqlite/      # IR -> SQLite SQL
    postgres/    # IR -> Postgres SQL
  diff/          # IR(old) vs IR(new) -> list of operations
  cli/           # `duronto generate | diff | migrate | check`
examples/
  blog/          # reference schema used in tests and docs
AGENTS.md
```

Each package has its own tests. `core` has **no dependency** on any other package.

---

## 5. Writing a schema

### 5.1 Tables and columns

```ts
import { table, id, text, int, bool, timestamp } from "duronto";

export const user = table("user", {
  id: id(),                              // primary key, auto id
  email: text().unique().notNull(),
  name: text().notNull(),
  age: int(),                            // nullable by default
  active: bool().default(true),
  createdAt: timestamp().defaultNow(),
});
```

Rules:

- A table is `table(name, columns)`. The object key is the TypeScript field name. The SQL column name defaults to `snake_case` of the key (`createdAt` -> `created_at`). Override with `.name("custom")`.
- Columns are **nullable by default**; call `.notNull()` to require a value. (Pick one default and keep it consistent everywhere.)
- Every table must have a primary key. `id()` is the shortcut.

### 5.2 Column types (initial set)

| Builder | TS type | SQLite | Postgres |
|---|---|---|---|
| `id()` | `number` | `INTEGER PRIMARY KEY AUTOINCREMENT` | `SERIAL PRIMARY KEY` |
| `uuid()` | `string` | `TEXT` | `UUID` |
| `text()` | `string` | `TEXT` | `TEXT` |
| `varchar(n)` | `string` | `TEXT` | `VARCHAR(n)` |
| `int()` | `number` | `INTEGER` | `INTEGER` |
| `bigint()` | `bigint` | `INTEGER` | `BIGINT` |
| `real()` | `number` | `REAL` | `DOUBLE PRECISION` |
| `bool()` | `boolean` | `INTEGER` (0/1) | `BOOLEAN` |
| `timestamp()` | `Date` | `TEXT` (ISO) | `TIMESTAMPTZ` |
| `json<T>()` | `T` | `TEXT` | `JSONB` |
| `enum(["a","b"])` | `"a" \| "b"` | `TEXT` + `CHECK` | native enum or `CHECK` |

The mapping table lives in each dialect package. Core only knows the **logical** type.

### 5.3 Column modifiers

| Modifier | Effect | Type effect |
|---|---|---|
| `.notNull()` | `NOT NULL` | removes `null` from the type |
| `.unique()` | `UNIQUE` | none |
| `.default(v)` | `DEFAULT v` | field becomes **optional on insert** |
| `.defaultNow()` | `DEFAULT CURRENT_TIMESTAMP` | optional on insert |
| `.primaryKey()` | `PRIMARY KEY` | not null, required unless it has a default |
| `.index()` | creates an index | none |
| `.check(expr)` | `CHECK (...)` | none |
| `.name("x")` | custom SQL column name | none |
| `.renamedFrom("old")` | tells diff this is a rename, not drop+add | none |

---

## 6. Relations

Relations in this tool are **schema-level only** (foreign keys). There is no runtime relation loading. They exist to (a) generate correct `FOREIGN KEY` constraints and (b) give columns the correct type automatically.

### 6.1 The `ref()` helper

```ts
ref(() => targetTable.column, options?)
```

- It takes a **thunk** (a function), so tables can reference each other and themselves without declaration-order problems.
- The resulting column automatically gets the **same type** as the referenced column. You never specify it twice.
- Options: `onDelete` and `onUpdate`, each one of `"cascade" | "set null" | "restrict" | "no action"`. Default: `"no action"`.

### 6.2 One-to-many (most common)

One user has many posts. The foreign key lives on the **"many"** side.

```ts
export const post = table("post", {
  id: id(),
  title: text().notNull(),
  authorId: ref(() => user.id, { onDelete: "cascade" }).notNull(),
});
```

Generated SQL (Postgres):

```sql
CREATE TABLE "post" (
  "id" SERIAL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "author_id" INTEGER NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
);
CREATE INDEX "post_author_id_idx" ON "post"("author_id");
```

Foreign key columns get an index by default (can be disabled with `.noIndex()`).

### 6.3 One-to-one

A foreign key plus `.unique()`.

```ts
export const profile = table("profile", {
  id: id(),
  userId: ref(() => user.id, { onDelete: "cascade" }).notNull().unique(),
  bio: text(),
});
```

### 6.4 Many-to-many

Use the `junction()` helper. It creates a join table with a composite primary key from two references.

```ts
export const tag = table("tag", {
  id: id(),
  label: text().notNull().unique(),
});

export const postTag = junction("post_tag", {
  post: () => post.id,
  tag: () => tag.id,
}, { onDelete: "cascade" });
```

Generated SQL:

```sql
CREATE TABLE "post_tag" (
  "post_id" INTEGER NOT NULL REFERENCES "post"("id") ON DELETE CASCADE,
  "tag_id"  INTEGER NOT NULL REFERENCES "tag"("id")  ON DELETE CASCADE,
  PRIMARY KEY ("post_id", "tag_id")
);
```

Need extra columns on the join table (e.g. `createdAt`)? Use a normal `table()` with two `ref()` columns and a composite key: `primaryKey(["postId", "tagId"])`.

### 6.5 Self-reference (trees, comments)

```ts
export const category = table("category", {
  id: id(),
  name: text().notNull(),
  parentId: ref((): AnyColumn => category.id, { onDelete: "set null" }),
});
```

TypeScript cannot infer a type that refers to itself, so self-references need the explicit `(): AnyColumn =>` return annotation. This is the one place an annotation is required. The tool still resolves the correct column type at compile time.

### 6.6 Composite keys and composite foreign keys

```ts
export const orderItem = table("order_item", {
  orderId: ref(() => order.id).notNull(),
  productId: ref(() => product.id).notNull(),
  qty: int().notNull(),
}, (t) => ({
  pk: primaryKey([t.orderId, t.productId]),
}));
```

The optional third argument is a callback for table-level constraints: `primaryKey`, `unique`, `index`, `foreignKey`, `check`.

### 6.7 Relation validation (done in `compiler`)

The compiler must error clearly when:

- a `ref()` target does not exist or is not in the schema,
- the target column is not unique or a primary key,
- a `set null` action is used on a `.notNull()` column,
- there is a circular dependency that cannot be ordered even with deferred constraints (see 8.4).

Error messages must name the table, the column, and what to change.

---

## 7. Type inference

The type system is the heart of the tool. Each column carries three phantom type parameters:

```ts
class Column<TData, TNotNull extends boolean, THasDefault extends boolean> { ... }
```

- `TData`: the TypeScript value type (`string`, `number`, `Date`, ...).
- `TNotNull`: flips from `false` to `true` on `.notNull()`.
- `THasDefault`: flips to `true` on `.default()` / `.defaultNow()` / auto id.

Public helpers:

```ts
type User    = InferSelect<typeof user>;  // what you read from the DB
type NewUser = InferInsert<typeof user>;  // what you pass to INSERT
type Patch   = InferUpdate<typeof user>;  // all fields optional
```

Example result for the `user` table above:

```ts
type User = {
  id: number;
  email: string;
  name: string;
  age: number | null;
  active: boolean | null;       // has default, but nullable unless .notNull()
  createdAt: Date | null;
};

type NewUser = {
  id?: number;
  email: string;
  name: string;
  age?: number | null;
  active?: boolean | null;
  createdAt?: Date | null;
};
```

Rules for agents editing `core`:

- Never use `any` in public types. Use `unknown` or generics.
- Add a **type test** for every new column type or modifier (use `expectTypeOf` or `tsd`). A feature without a type test is incomplete.
- Keep inference cheap. Avoid deeply recursive conditional types, since they slow the editor on large schemas.
- Builders are immutable: each modifier returns a **new** column object with updated type parameters.

---

## 8. The IR (Intermediate Representation)

The IR is plain JSON. It contains no functions and no class instances. This is what gets saved as a snapshot and diffed.

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
      "checks": []
    }
  }
}
```

### 8.1 Rules

- The IR uses **SQL names** (snake_case), not TS field names.
- The IR is **dialect-neutral**. `"type": "timestamp"` is logical, not `TIMESTAMPTZ`.
- Always include a `version`. Bump it on breaking IR changes and provide a upgrader.
- Output must be **deterministic**: sorted keys, stable ordering, so snapshots diff cleanly in git.

### 8.2 Dialect interface

```ts
interface Dialect {
  name: string;
  columnType(col: IRColumn): string;
  createTable(table: IRTable): string[];
  alterOps(ops: DiffOp[]): string[];
  quote(identifier: string): string;
}
```

Adding a dialect = adding a new folder in `packages/dialects/` that implements this interface. No other package changes.

### 8.3 Dialect capability differences

SQLite cannot do many `ALTER TABLE` operations (drop column constraints, change type). The SQLite dialect must emit the "create new table, copy, drop old, rename" sequence. Put such logic only inside the dialect.

### 8.4 Ordering

Tables are emitted in **dependency order** (topological sort on foreign keys). For cycles, emit tables first and add the foreign keys afterwards with `ALTER TABLE ... ADD CONSTRAINT` (where the dialect supports it).

---

## 9. Migrations (diff)

Flow:

1. `generate` compiles the current schema to IR.
2. It loads the last snapshot from `./migrations/meta/latest.json`.
3. `diff(old, new)` returns a list of **operations**:
   `createTable`, `dropTable`, `addColumn`, `dropColumn`, `alterColumn`, `addIndex`, `dropIndex`, `addForeignKey`, `dropForeignKey`, `renameColumn`, `renameTable`.
4. The dialect turns operations into SQL, written to `./migrations/0001_<name>.sql`.
5. The new snapshot replaces `latest.json`.

### 9.1 Renames

A rename looks like a drop + add. We never guess silently. The user must declare it:

```ts
name: text().notNull().renamedFrom("full_name"),
```

Without that hint, the diff emits `dropColumn` + `addColumn` and prints a **warning**: "possible data loss".

### 9.2 Destructive changes

`dropTable`, `dropColumn`, and narrowing type changes are flagged as **destructive**. The CLI refuses to write them unless `--allow-destructive` is passed, and prints the exact SQL it would run.

### 9.3 Example

Schema change: add `bio` to `user`.

```ts
bio: text(),
```

Generated migration (`0002_add_user_bio.sql`):

```sql
ALTER TABLE "user" ADD COLUMN "bio" TEXT;
```

---

## 10. CLI

| Command | Purpose |
|---|---|
| `duronto init` | creates `duronto.config.ts` and the migrations folder |
| `duronto generate [--name x]` | schema -> new migration SQL + snapshot |
| `duronto sql` | prints the full `CREATE` SQL for the current schema (no files written) |
| `duronto types` | writes generated type definitions |
| `duronto check` | exits non-zero if schema and latest snapshot differ (for CI) |
| `duronto diff` | shows pending operations without writing |

The CLI does **not** connect to databases in the MVP. It writes `.sql` files; the user applies them with their own tool. (An optional `migrate` command that applies files can come later, as a separate package.)

### Config

```ts
// duronto.config.ts
import { defineConfig } from "duronto";

export default defineConfig({
  schema: "./src/db/schema.ts",   // file or folder
  out: "./migrations",
  dialect: "postgres",            // "sqlite" | "postgres"
  naming: "snake_case",           // how TS keys map to SQL names
});
```

---

## 11. Complete example

```ts
// src/db/schema.ts
import { table, junction, id, text, int, bool, timestamp, ref } from "duronto";

export const user = table("user", {
  id: id(),
  email: text().unique().notNull(),
  name: text().notNull(),
  createdAt: timestamp().defaultNow().notNull(),
});

export const post = table("post", {
  id: id(),
  title: text().notNull(),
  body: text(),
  published: bool().default(false).notNull(),
  authorId: ref(() => user.id, { onDelete: "cascade" }).notNull(),
});

export const tag = table("tag", {
  id: id(),
  label: text().unique().notNull(),
});

export const postTag = junction("post_tag", {
  post: () => post.id,
  tag: () => tag.id,
}, { onDelete: "cascade" });
```

Run:

```bash
npx duronto generate --name init
```

Produces `migrations/0001_init.sql` with `user`, `post`, `tag`, `post_tag` created in dependency order, plus indexes on `post.author_id`.

---

## 12. Coding conventions

- Language: TypeScript, `strict: true`, `noUncheckedIndexedAccess: true`.
- ESM only. Target modern Node (LTS).
- No classes in public API surface except the column/table builders; prefer plain functions.
- Small files. One concept per file. No circular imports between packages.
- Errors: throw typed errors with a stable `code` and a human-readable fix hint. Never swallow errors.
- Naming: functions are verbs (`compileSchema`), types are nouns (`IRTable`).
- Comments explain **why**, not what.

## 13. Testing

- **Unit tests** for every builder and modifier.
- **Type tests** for every inference rule (section 7).
- **Snapshot tests** for SQL output per dialect, using `examples/blog`.
- **Diff tests**: for each operation type, an old IR, a new IR, and the expected SQL.
- **Round-trip test**: apply generated SQL to a real SQLite in-memory DB in CI to confirm it is valid.
- Any bug fix must come with a failing test first.

## 14. Rules for AI agents

1. Read this file before changing anything. If a change conflicts with the principles in section 1, stop and ask.
2. Do not add runtime features (query builder, drivers, connections). See non-goals.
3. Do not add dependencies without justification. Prefer writing 20 lines over adding a package.
4. Do not put dialect-specific code in `core`, `compiler`, or `diff`.
5. Keep the IR JSON-serializable and deterministic.
6. Every public API change needs: a type test, a unit test, and a doc update in this file.
7. Never silently drop data in migrations. Destructive operations must be explicit.
8. When unsure about an API design, choose the option that makes the **user's schema shorter and clearer**.
9. Run `lint`, `typecheck`, and `test` before reporting work as done.

## 15. Roadmap

| Version | Scope |
|---|---|
| **v0.1 (MVP)** | one dialect, tables, columns, modifiers, `sql` command, type inference |
| **v0.2** | `ref()`, `junction()`, indexes, constraints, relation validation |
| **v0.3** | snapshots, `diff`, `generate`, rename hints, destructive-change guard |
| **v0.4** | second dialect, `check` for CI |
| **v0.5** | plugin API for custom column types and dialects |
| **later** | optional separate packages: query builder, `migrate` runner, introspection |

## 16. Open decisions (resolved for v0.1)

- [x] Final project name and npm scope: keep `duronto` (placeholder) for v0.1.
- [x] First dialect: SQLite.
- [x] Nullable by default.
- [x] CLI implementation: Node/TypeScript.
- [ ] Whether to also offer a non-TypeScript schema format later. (deferred)

### v0.1 deviations
- `enum` is a reserved word and cannot be a binding; the builder is exported as `enumType`.
- Tables expose their columns as top-level properties for `ref(() => table.column)` ergonomics.
