import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { DatabaseSync } = require("node:sqlite");
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createJiti } from "jiti";
import { pathToFileURL } from "node:url";
import { compileSchema } from "../../../src/compiler/compile.js";
import { sqliteDialect } from "../../../src/dialects/sqlite/index.js";

describe("round trip", () => {
  it("applies generated sql to sqlite", async () => {
    const dir = mkdtempSync(join(tmpdir(), "rt-"));
    const schemaPath = join(dir, "schema.ts");
    writeFileSync(schemaPath, `
import { table, junction, id, text, int, bool, timestamp, ref } from ${JSON.stringify("D:/code/node/duronto/dist/index.js")};
export const user = table("user", { id: id(), email: text().unique().notNull(), name: text().notNull(), createdAt: timestamp().defaultNow().notNull() });
export const post = table("post", { id: id(), title: text().notNull(), body: text(), published: bool().default(false).notNull(), authorId: ref(() => user.id, { onDelete: "cascade" }).notNull() });
export const tag = table("tag", { id: id(), label: text().unique().notNull() });
export const postTag = junction("post_tag", { post: () => post.id, tag: () => tag.id }, { onDelete: "cascade" });
`);
    const jiti = createJiti(pathToFileURL(schemaPath).href, { moduleCache: false });
    const mod = await jiti.import(schemaPath);
    const ir = compileSchema(mod as Record<string, unknown>);
    const db = new DatabaseSync(":memory:");
    for (const t of Object.values(ir.tables)) {
      for (const stmt of sqliteDialect.createTable(t)) {
        db.exec(stmt);
      }
    }
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all() as { name: string }[];
    const names = tables.map((r) => r.name);
    expect(names).toContain("user");
    expect(names).toContain("post");
    expect(names).toContain("post_tag");
    db.close();
  });
});