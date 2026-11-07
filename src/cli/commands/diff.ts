import path from "node:path";
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { createJiti } from "jiti";
import { loadConfig } from "../config.js";
import { compileSchema } from "../../compiler/compile.js";
import { diff } from "../../diff/diff.js";
import { loadSnapshot } from "../../snapshot.js";

export async function runDiff(cwd: string = process.cwd(), json: boolean = false): Promise<string> {
  const cfg = await loadConfig(cwd);
  const schemaPath = path.resolve(cwd, cfg.schema);
  if (!existsSync(schemaPath)) throw new Error(`Schema file not found: ${schemaPath}`);
  const jiti = createJiti(pathToFileURL(schemaPath).href, { moduleCache: false });
  const mod = (await jiti.import(schemaPath)) as Record<string, unknown>;
  const ir = compileSchema(mod);
  const outDir = path.resolve(cwd, cfg.out);
  const oldIR = loadSnapshot(outDir);
  const result = diff(oldIR, ir);
  if (json) return JSON.stringify({ ops: result.ops }, null, 2) + "\n";
  if (result.ops.length === 0) return "No pending changes.\n";
  return result.ops.map((o) => `${o.kind}`).join("\n") + "\n";
}