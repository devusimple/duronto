import path from "node:path";
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { createJiti } from "jiti";
import { loadConfig } from "../config.js";
import { compileSchema } from "../../compiler/compile.js";
import { diff } from "../../diff/diff.js";
import { loadSnapshot } from "../../snapshot.js";

export async function runCheck(cwd: string = process.cwd()): Promise<boolean> {
  const cfg = await loadConfig(cwd);
  const schemaPath = path.resolve(cwd, cfg.schema);
  if (!existsSync(schemaPath)) throw new Error(`Schema file not found: ${schemaPath}`);
  const jiti = createJiti(pathToFileURL(schemaPath).href, { moduleCache: false });
  const mod = (await jiti.import(schemaPath)) as Record<string, unknown>;
  const ir = compileSchema(mod);
  const outDir = path.resolve(cwd, cfg.out);
  const oldIR = loadSnapshot(outDir);
  const result = diff(oldIR, ir);
  return result.ops.length === 0;
}