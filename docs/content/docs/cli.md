---
title: CLI reference
description: Command reference and configuration for the duronto CLI.
---

The CLI loads the project configuration, resolves the schema module, and produces SQL, type artifacts, diffs, or migration files. It does not connect to a database; it generates files/output for external execution.

## Command reference

| Command | Description |
|---|---|
| `duronto init` | Initialize configuration and migration directory scaffolding. |
| `duronto sql` | Print full `CREATE` SQL for the compiled schema to stdout. |
| `duronto types [--out <file>]` | Generate type aliases derived from the schema. |
| `duronto sdk [--out <file>]` | Generate a standalone, dependency-free TypeScript type module. |
| `duronto generate [--name <name>] [--allow-destructive]` | Diff schema against the latest snapshot and write migration SQL plus an updated snapshot. |
| `duronto diff [--json]` | Report pending operations without writing migration files. |
| `duronto check` | Compare schema to the latest snapshot; exit non-zero when they differ (CI). |
| `duronto help` | Print usage information. |

## Options

| Option | Applies to | Description |
|---|---|---|
| `--name <name>` | `generate` | Label for the migration file name. |
| `--allow-destructive` | `generate` | Permit destructive operations (drops/narrowing changes). Without this flag, generation fails when destructive operations are detected. |
| `--out <file>` | `types`, `sdk` | Override the output file path. |
| `--json` | `diff` | Emit diff information as JSON when supported. |

## Configuration

```ts
import { defineConfig } from "duronto";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./migrations",
  dialect: "sqlite",    // "sqlite" | "postgres"
  naming: "snake_case",
});
```

| Field | Description |
|---|---|
| `schema` | Schema module path used by the compiler/CLI loader. |
| `out` | Output directory for migrations and snapshot metadata. |
| `dialect` | SQL dialect used for rendering (`sqlite` or `postgres`). |
| `naming` | Mapping from TypeScript field names to SQL column names. |

## Operational notes

- Run `duronto check` in CI to detect schema/snapshot divergence.
- Treat `--allow-destructive` as an explicit review gate; review generated SQL before applying destructive migrations.
