---
title: Getting started
description: Install duronto, configure a schema path and dialect, and generate SQL or type artifacts.
---

## Requirements

- Node.js (LTS recommended)
- A TypeScript project for schema authoring

## Installation

Install duronto as a development dependency:

```bash
npm i -D duronto
```

## Initialization

```bash
npx duronto init
```

`init` creates a `duronto.config.*` file and a migrations directory. It may also create a starter schema file, depending on the project template.

## Configuration

```ts
// duronto.config.ts
import { defineConfig } from "duronto";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./migrations",
  dialect: "sqlite",      // "sqlite" | "postgres"
  naming: "snake_case",   // mapping for TS field names to SQL column names
});
```

| Field | Meaning |
|---|---|
| `schema` | Path to the schema module or schema entry point |
| `out` | Directory for migration SQL and snapshot metadata |
| `dialect` | Target SQL dialect |
| `naming` | Column-name mapping strategy |

## Defining a schema

```ts
// src/db/schema.ts
import { table, id, text, int, timestamp, ref } from "duronto";

export const user = table("user", {
  id: id(),
  email: text().unique().notNull(),
  name: text().notNull(),
  age: int(),
  createdAt: timestamp().defaultNow().notNull(),
});

export const post = table("post", {
  id: id(),
  title: text().notNull(),
  authorId: ref(() => user.id, { onDelete: "cascade" }).notNull(),
});
```

Export each table from the schema module. The CLI loads exported table objects and compiles them to IR.

## Generating artifacts

| Command | Output |
|---|---|
| `npx duronto sql` | Full `CREATE` SQL for the current schema (stdout) |
| `npx duronto generate --name init` | Migration SQL file and updated snapshot |
| `npx duronto types` | Type alias file derived from the schema |
| `npx duronto sdk --out ./src/db/sdk.gen.ts` | Standalone type definitions with no duronto import |

duronto does not apply migrations to a database. Use your migration runner or database client to execute generated SQL.

## Runtime usage rule

Do not import duronto from production application code. Consume type artifacts (`types`/`sdk`) or use `import type` so the dependency is erased during compilation.
