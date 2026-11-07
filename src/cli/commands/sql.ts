import path from "node:path";
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { createJiti } from "jiti";
import { loadConfig } from "../config.js";
import { compileSchema } from "../../compiler/compile.js";
import { getDialect } from "../../index.js";

export async function runSql(cwd: string = process.cwd()): Promise<string> {
  const cfg = await loadConfig(cwd);
  const schemaPath = path.resolve(cwd, cfg.schema);
  if (!existsSync(schemaPath)) throw new Error(`Schema file not found: ${schemaPath}`);
  const jiti = createJiti(pathToFileURL(schemaPath).href, { moduleCache: false });
  const mod = (await jiti.import(schemaPath)) as Record<string, unknown>;
  const ir = compileSchema(mod);
  const dialect = getDialect(cfg.dialect);
  const lines: string[] = [];
  for (const t of Object.values(ir.tables)) {
    lines.push(...dialect.createTable(t));
    lines.push("");
  }
  return lines.join("\n").trim() + "\n";
}