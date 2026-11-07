---
title: Type generation
description: How duronto infers TypeScript types and the differences between Infer* helpers, generated type aliases, and the dependency-free SDK.
---

duronto derives TypeScript types from schema definitions. Because duronto is a development-time dependency, application code should consume generated artifacts or type-only imports.

## Inference model

Each column carries type metadata (logical data type, nullability, and default/insert behavior). Modifiers such as `.notNull()` and `.default(...)` affect both SQL output and inferred types.

| Column state | `InferSelect` | `InferInsert` | `InferUpdate` |
|---|---|---|---|
| Nullable, no default | `T \| null` | optional: `T \| null` | optional: `T \| null` |
| `.notNull()`, no default | `T` | required: `T` | optional: `T` |
| Has default / auto id | as defined by column | optional | optional (select-shaped) |

## `Infer*` helpers

```ts
import type { InferSelect, InferInsert, InferUpdate } from "duronto";
import { user } from "./db/schema";

type User = InferSelect<typeof user>;
type NewUser = InferInsert<typeof user>;
type UserPatch = InferUpdate<typeof user>;
```

Use `import type` for duronto imports. Schema modules used only in type positions should also be erased by your TypeScript build configuration.

## `duronto types`

```bash
npx duronto types
```

Generates a declaration file (by default next to the schema) containing aliases that reference duronto’s inference helpers:

```ts
export type User = import("duronto").InferSelect<typeof user>;
```

## `duronto sdk`

```bash
npx duronto sdk --out ./src/db/sdk.gen.ts
```

Generates standalone `export type` declarations with **no duronto import**.

Behavior notes:

- Foreign key columns resolve to the referenced target column’s TypeScript data type.
- `enumType([...])` is emitted as a string-literal union.
- `json()` columns are emitted as `unknown`. The generic parameter of `json<T>()` is compile-time metadata and not preserved in runtime column state, so the SDK generator cannot recover `T`.
- Field names follow the schema’s TypeScript field names.

## Choosing an output

| Need | Recommended |
|---|---|
| In-project inference from schema objects | `Infer*` + `import type` |
| Generated aliases tied to schema inference | `duronto types` |
| Standalone type file with no duronto dependency | `duronto sdk` |
