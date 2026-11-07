import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { DatabaseSync: DS } = require("node:sqlite");
import { table, id, int, ref, foreignKey, primaryKey } from "../../../src/index.js";
import { compileSchema } from "../../../src/compiler/compile.js";
import { sqliteDialect } from "../../../src/dialects/sqlite/index.js";

describe("composite foreign key", () => {
  it("generates and applies", () => {
    const parent = table("parent", {
      a: int().notNull(),
      b: int().notNull(),
    }, (t) => ({ pk: primaryKey([t.a, t.b]) }));

    const child = table("child", {
      id: id(),
      pa: int().notNull(),
      pb: int().notNull(),
    }, (t) => ({
      fk: foreignKey([t.pa, t.pb], () => [parent.a, parent.b]),
    }));

    const ir = compileSchema({ parent, child });
    const db = new DS(":memory:");
    for (const t of Object.values(ir.tables)) {
      for (const stmt of sqliteDialect.createTable(t)) db.exec(stmt);
    }
    const tables = (db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as any[]).map((r) => r.name);
    expect(tables).toContain("child");
    db.close();
  });
});

describe("cyclic schema", () => {
  it("compiles and applies", () => {
    const a = table("a", { id: id(), bId: ref(() => b.id) });
    const b = table("b", { id: id(), aId: ref(() => a.id) });
    const ir = compileSchema({ a, b });
    const db = new DS(":memory:");
    for (const t of Object.values(ir.tables)) {
      for (const stmt of sqliteDialect.createTable(t)) db.exec(stmt);
    }
    const tables = (db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as any[]).map((r) => r.name);
    expect(tables).toContain("a");
    expect(tables).toContain("b");
    db.close();
  });
});