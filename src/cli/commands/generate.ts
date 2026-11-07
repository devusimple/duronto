import path from "node:path";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { createJiti } from "jiti";
import { loadConfig } from "../config.js";
import { compileSchema } from "../../compiler/compile.js";
import { diff } from "../../diff/diff.js";
import { getDialect } from "../../index.js";
import { loadSnapshot, saveSnapshot, nextMigrationNumber } from "../../snapshot.js";

export interface GenerateOptions {
  name?: string;
  allowDestructive?: boolean;
}

export async function runGenerate(cwd: string = process.cwd(), opts: GenerateOptions = {}): Promise<string> {
  const cfg = await loadConfig(cwd);
  const schemaPath = path.resolve(cwd, cfg.schema);
  if (!existsSync(schemaPath)) throw new Error(`Schema file not found: ${schemaPath}`);
  const jiti = createJiti(pathToFileURL(schemaPath).href, { moduleCache: false });
  const mod = (await jiti.import(schemaPath)) as Record<string, unknown>;
  const ir = compileSchema(mod);
  const outDir = path.resolve(cwd, cfg.out);
  mkdirSync(outDir, { recursive: true });

  const oldIR = loadSnapshot(outDir);
  const result = diff(oldIR, ir);

  if (result.destructive && !opts.allowDestructive) {
    const destructiveOps = result.ops.filter((o) => (o as { destructive?: boolean }).destructive);
    throw new Error(
      `Destructive changes detected (${destructiveOps.length}). Re-run with --allow-destructive to apply:\n` +
        destructiveOps.map((o) => `  - ${o.kind}`).join("\n"),
    );
  }

  const dialect = getDialect(cfg.dialect);
  const lines: string[] = [];
  // new tables
  for (const op of result.ops) {
    if (op.kind === "createTable") {
      lines.push(...dialect.createTable(ir.tables[op.table]!));
      lines.push("");
    }
  }
  // other ops
  const changeOps = result.ops.filter((o) => o.kind !== "createTable");
  lines.push(...dialect.alterOps(changeOps));
  if (lines.length && lines[lines.length - 1] !== "") lines.push("");

  const num = nextMigrationNumber(outDir);
  const baseName = opts.name ?? "migration";
  const fileName = `${String(num).padStart(4, "0")}_${baseName}.sql`;
  const filePath = path.join(outDir, fileName);
  writeFileSync(filePath, lines.join("\n").trim() + "\n");

  saveSnapshot(outDir, ir, "latest.json");
  // also save numbered snapshot
  saveSnapshot(outDir, ir, `${String(num).padStart(4, "0")}.json`);

  return filePath;
}