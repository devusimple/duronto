import { pathToFileURL } from "node:url";
import { existsSync } from "node:fs";
import path from "node:path";
import { createJiti } from "jiti";

export interface LoadedConfig {
  schema: string;
  out: string;
  dialect: string;
  naming: string;
  root: string;
}

export async function loadConfig(cwd: string = process.cwd()): Promise<LoadedConfig> {
  const candidates = ["duronto.config.ts", "duronto.config.mts", "duronto.config.js", "duronto.config.mjs"];
  let configPath: string | undefined;
  for (const c of candidates) {
    const p = path.join(cwd, c);
    if (existsSync(p)) { configPath = p; break; }
  }
  if (!configPath) {
    throw new Error("No duronto.config.* found. Run `duronto init` first.");
  }
  const jiti = createJiti(pathToFileURL(configPath).href, { moduleCache: false });
  const mod = (await jiti.import(configPath)) as { default?: unknown };
  const cfg = (mod.default ?? mod) as Record<string, unknown>;
  return {
    schema: String(cfg.schema ?? "./src/db/schema.ts"),
    out: String(cfg.out ?? "./migrations"),
    dialect: String(cfg.dialect ?? "sqlite"),
    naming: String(cfg.naming ?? "snake_case"),
    root: cwd,
  };
}