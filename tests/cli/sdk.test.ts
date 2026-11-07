import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const ROOT = resolve(__dirname, "../..");
const CLI = join(ROOT, "dist/cli/index.js");
const PKG = join(ROOT, "dist/index.js").replace(/\\/g, "/");

describe("duronto sdk", () => {
  it("generates a dependency-free, parseable SDK with correct types", () => {
    const dir = mkdtempSync(join(tmpdir(), "duronto-sdk-"));
    mkdirSync(join(dir, "src/db"), { recursive: true });
    writeFileSync(
      join(dir, "duronto.config.ts"),
      `export default { schema: "./src/db/schema.ts", out: "./migrations", dialect: "sqlite", naming: "snake_case" };\n`,
    );
    writeFileSync(
      join(dir, "src/db/schema.ts"),
      `import { table, junction, id, text, int, bool, timestamp, ref, json, enumType, varchar } from "${PKG}";\n` +
        `export const user = table("user", { id: id(), email: text().unique().notNull(), name: text().notNull(), age: int(), active: bool().default(true), createdAt: timestamp().defaultNow().notNull(), meta: json() });\n` +
        `export const post = table("post", { id: id(), title: text().notNull(), status: enumType(["draft","pub"]).notNull(), authorId: ref(() => user.id, { onDelete: "cascade" }).notNull(), slug: varchar(100) });\n` +
        `export const postTag = junction("post_tag", { post: () => post.id, tag: () => tag.id });\n`,
    );
    execFileSync(process.execPath, [CLI, "sdk", "--out", "./src/db/sdk.gen.ts"], { cwd: dir, stdio: "pipe" });
    const generated = readFileSync(join(dir, "src/db/sdk.gen.ts"), "utf8");

    expect(generated).not.toContain('import("duronto")');
    expect(generated).not.toContain('from "duronto"');

    // valid, one type body per export
    expect(generated).toContain("export type Post = {");
    expect(generated).toContain("export type NewPost = {");
    expect(generated).toContain("export type PostPatch = {");
    expect(generated).toContain("export type User = {");

    // ref resolves to target data type
    expect(generated).toContain("authorId: number;");

    // enum union preserved
    expect(generated).toContain('status: "draft" | "pub";');

    // nullable select and nullable insert accept null
    expect(generated).toContain("age: number | null;");
    expect(generated).toContain("age?: number | null;");

    // defaults optional on insert
    expect(generated).toContain("active?: boolean | null;");
    expect(generated).toContain("createdAt?: Date;");

    // required insert field
    expect(generated).toContain("email: string;");

    writeFileSync(join(dir, "tsconfig.json"), JSON.stringify({ compilerOptions: { strict: true, noEmit: true, target: "ES2022", module: "NodeNext", moduleResolution: "NodeNext" }, include: ["src/db/sdk.gen.ts"] }));
    execFileSync(process.execPath, [join(ROOT, "node_modules/typescript/bin/tsc"), "-p", "tsconfig.json"], { cwd: dir, stdio: "pipe" });
  });
});
