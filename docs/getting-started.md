# Getting started

## Install

```bash
npm i -D duronto
```

## Initialize a project

```bash
npx duronto init
```

This creates `duronto.config.ts`, a `migrations/` folder, and a starter `src/db/schema.ts`.

## Config

```ts
// duronto.config.ts
import { defineConfig } from "duronto";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./migrations",
  dialect: "sqlite",
  naming: "snake_case",
});
```

## Write a schema

```ts
// src/db/schema.ts
import { table, id, text, int, bool, timestamp, ref } from "duronto";

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
  body: text(),
  published: bool().default(false).notNull(),
  authorId: ref(() => user.id, { onDelete: "cascade" }).notNull(),
});
```

## Print SQL

```bash
npx duronto sql
```

## Types in app code

```ts
import type { InferSelect, InferInsert } from "duronto";
import { user } from "./db/schema";

type User = InferSelect<typeof user>;
type NewUser = InferInsert<typeof user>;
```

Use `import type` so the package is erased from the runtime bundle.