# CLI

| Command | Purpose |
|---|---|
| `duronto init` | creates `duronto.config.ts` and the migrations folder |
| `duronto sql` | prints the full `CREATE` SQL for the current schema |
| `duronto types` | writes generated type definitions next to the schema |
| `duronto generate [--name x] [--allow-destructive]` | schema -> new migration SQL + snapshot |
| `duronto diff` | shows pending operations without writing |
| `duronto check` | exits non-zero if schema and latest snapshot differ (CI) |
| `duronto help` | shows usage |

## Config

```ts
// duronto.config.ts
import { defineConfig } from "duronto";

export default defineConfig({
  schema: "./src/db/schema.ts",   // file or folder
  out: "./migrations",
  dialect: "sqlite",             // "sqlite" | "postgres"
  naming: "snake_case",          // how TS keys map to SQL names
});
```

The CLI does not connect to databases in the MVP. It writes SQL files; the user applies them with their own tool.