import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("generate destructive guard", () => {
  it("refuses destructive changes without flag", () => {
    const dir = mkdtempSync(join(tmpdir(), "gen-"));
    mkdirSync(dir + "/src/db", { recursive: true });
    writeFileSync(dir + "/duronto.config.ts", `export default { schema: "./src/db/schema.ts", out: "./migrations", dialect: "sqlite", naming: "snake_case" };\n`);
    writeFileSync(dir + "/src/db/schema.ts", `import { table, id, text } from "D:/code/node/duronto/dist/index.js";\nexport const user = table("user", { id: id(), name: text().notNull() });\n`);
    const cli = "D:/code/node/duronto/dist/cli/index.js";
    execSync(`node ${cli} generate --name init`, { cwd: dir });
    // remove column (destructive)
    writeFileSync(dir + "/src/db/schema.ts", `import { table, id } from "D:/code/node/duronto/dist/index.js";\nexport const user = table("user", { id: id() });\n`);
    let threw = false;
    try {
      execSync(`node ${cli} generate --name drop`, { cwd: dir, stdio: "pipe" });
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
  });
});