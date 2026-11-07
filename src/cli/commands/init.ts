import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";

export function runInit(cwd: string = process.cwd()): void {
  const configPath = path.join(cwd, "duronto.config.ts");
  if (!existsSync(configPath)) {
    writeFileSync(
      configPath,
      `import { defineConfig } from "duronto";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./migrations",
  dialect: "sqlite",
  naming: "snake_case",
});
`,
    );
  }
  const migDir = path.join(cwd, "migrations");
  if (!existsSync(migDir)) mkdirSync(migDir, { recursive: true });
  const schemaDir = path.join(cwd, "src", "db");
  if (!existsSync(schemaDir)) mkdirSync(schemaDir, { recursive: true });
  const schemaPath = path.join(schemaDir, "schema.ts");
  if (!existsSync(schemaPath)) {
    writeFileSync(
      schemaPath,
      `import { table, id, text, int, bool, timestamp, ref } from "duronto";

export const user = table("user", {
  id: id(),
  email: text().unique().notNull(),
  name: text().notNull(),
  age: int(),
  createdAt: timestamp().defaultNow().notNull(),
});
`,
    );
  }
}