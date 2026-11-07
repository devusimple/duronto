import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createJiti } from "jiti";
import { pathToFileURL } from "node:url";
import { compileSchema } from "../../../src/compiler/compile.js";
import { sqliteDialect } from "../../../src/dialects/sqlite/index.js";

describe("sqlite sql generation", () => {
  it("generates blog schema", async () => {
    const dir = mkdtempSync(join(tmpdir(), "ts-"));
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
    const lines: string[] = [];
    for (const t of Object.values(ir.tables)) lines.push(...sqliteDialect.createTable(t));
    const sql = lines.join("\n");
    expect(sql).toContain('CREATE TABLE "user"');
    expect(sql).toContain('CREATE TABLE "post_tag"');
    expect(sql).toContain("post_id");
  });
});