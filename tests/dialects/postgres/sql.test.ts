import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createJiti } from "jiti";
import { pathToFileURL } from "node:url";
import { compileSchema } from "../../../src/compiler/compile.js";
import { postgresDialect } from "../../../src/dialects/postgres/index.js";

describe("postgres sql generation", () => {
  it("generates user table with pg types", async () => {
    const dir = mkdtempSync(join(tmpdir(), "pg-"));
    const schemaPath = join(dir, "schema.ts");
    writeFileSync(schemaPath, `import { table, id, text, int, bool, timestamp, ref, varchar, json, enumType, uuid } from ${JSON.stringify("D:/code/node/duronto/dist/index.js")};
export const user = table("user", {
  id: id(),
  uuid: uuid().unique(),
  email: varchar(255).unique().notNull(),
  name: text().notNull(),
  age: int(),
  active: bool().default(true),
  meta: json<{x:number}>(),
  role: enumType(["admin","user"]).default("user"),
  createdAt: timestamp().defaultNow().notNull(),
});`);
    const jiti = createJiti(pathToFileURL(schemaPath).href, { moduleCache: false });
    const mod = await jiti.import(schemaPath);
    const ir = compileSchema(mod as Record<string, unknown>);
    const lines: string[] = [];
    for (const t of Object.values(ir.tables)) lines.push(...postgresDialect.createTable(t));
    const sql = lines.join("\n");
    expect(sql).toContain("SERIAL PRIMARY KEY");
    expect(sql).toContain("VARCHAR(255)");
    expect(sql).toContain("TIMESTAMPTZ");
    expect(sql).toContain("JSONB");
    expect(sql).toContain("BOOLEAN");
  });
});